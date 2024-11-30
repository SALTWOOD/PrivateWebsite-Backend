import { RouteFactory } from "./RouteFactory.js";
import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import fs, { read } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Utilities } from "../Utilities.js";

export class RouteUpload {
    public static register(inst: RouteFactory): void {
        // 上传认证中间件
        inst.app.use("/api/upload", async (req: Request, res: Response, next: NextFunction) => {
            const user = await Utilities.getUser(req, inst.db);
            if (!user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            if (user.permission < 1) {
                res.status(403).json({ error: 'Forbidden' });
                return;
            }
            next();
        });

        // 配置 Multer
        const maxFileSize = 50 * 1024 * 1024;  // 最大文件大小限制 50MB

        const storage = multer.memoryStorage();  // 使用内存存储
        const upload = multer({
            storage,
            limits: {
                fileSize: maxFileSize,  // 文件大小限制
            }
        });

        // 存储上传会话信息
        const uploadSessions: { [sessionId: string]: { filename: string, totalChunks: number, uploadedChunks: Set<number>, timeout: NodeJS.Timeout, finalName: string } } = {};

        // 启动上传会话
        inst.app.post('/api/upload/new', async (req: Request, res: Response) => {
            const { filename, fileSize } = req.body;
            const sessionId = uuidv4();
            const finalName = `${Date.now()}-${filename}`;

            if (fileSize > 50 * 1024 * 1024) {
                res.status(400).json({ error: 'File size exceeds limit' });
                return;
            }

            const chunkSize = 16 * 1024; // 每片大小最大16KB
            const totalChunks = Math.ceil(fileSize / chunkSize);  // 计算分片数

            const sessionTimeout = setTimeout(() => {
                console.log(`Session ${sessionId} timed out, and it was removed`);
                for (const i of uploadSessions[sessionId].uploadedChunks) {
                    const chunkPath = path.join('.', 'assets/uploads', `${finalName}.part${i}`);
                    fs.unlinkSync(chunkPath);  // 删除临时分片
                }
                delete uploadSessions[sessionId]; // 超时清理
            }, 5 * 60 * 1000); // 5分钟超时

            uploadSessions[sessionId] = {
                filename,
                totalChunks,
                uploadedChunks: new Set(),
                timeout: sessionTimeout,
                finalName
            };

            res.json({ sessionId, totalChunks, size: fileSize, filename, finalName });
        });

        // 上传分片
        inst.app.post('/api/upload/session', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
            try {
                const { sessionId, chunk, totalChunks, finalName } = req.body;
                const chunkIndex = parseInt(chunk);

                if (!uploadSessions[sessionId]
                    || uploadSessions[sessionId].finalName !== finalName
                    || uploadSessions[sessionId].totalChunks !== Number(totalChunks)
                ) {
                    res.status(400).json({ error: 'Invalid session' });
                    return;
                }

                const session = uploadSessions[sessionId];

                // 检查是否已上传该分片
                if (session.uploadedChunks.has(chunkIndex)) {
                    res.status(200).json({ message: 'Chunk already uploaded' });
                    return;
                }

                // 保存分片
                const chunkFilePath = path.join('.', 'assets/uploads', `${finalName}.part${chunkIndex}`);
                if (!req.file?.buffer) {
                    res.status(400).json({ error: 'Invalid file' });
                    return;
                }

                await writeChunk(chunkFilePath, req.file.buffer);  // 异步写入分片
                session.uploadedChunks.add(chunkIndex);

                // 如果所有分片上传完成，则合并分片
                if (session.uploadedChunks.size >= session.totalChunks) {
                    await mergeChunks(session, finalName);
                    delete uploadSessions[sessionId]; // 清理会话
                    clearTimeout(session.timeout);  // 清理超时计时器
                    res.status(200).json({ message: 'File uploaded successfully and merged', finalName });
                } else {
                    res.status(200).json({ message: 'Chunk uploaded successfully' });
                }
            } catch (error) {
                next(error);  // 错误交给全局错误处理中间件
            }
        });

        // 错误处理中间件
        inst.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
            console.error(err.stack);
            res.status(500).json({ error: err.message || 'Internal Server Error' });
        });
    }
}

// 辅助函数：写入分片
const writeChunk = (chunkFilePath: string, buffer: Buffer): Promise<void> => {
    return new Promise((resolve, reject) => {
        fs.writeFile(chunkFilePath, buffer, (err) => {
            if (err) {
                reject(new Error('Unable to write chunk file'));
            } else {
                resolve();
            }
        });
    });
};

const mergeChunks = async (session: any, filename: string): Promise<void> => {
    const finalFilePath = path.join('.', 'assets/uploads', filename);
    const writeStream = fs.createWriteStream(finalFilePath);

    // 按照顺序合并分片
    for (let i = 0; i < session.totalChunks; i++) {
        const chunkPath = path.join('.', 'assets/uploads', `${filename}.part${i}`);
        try {
            const chunkStream = fs.createReadStream(chunkPath);
            await writeChunkToFile(chunkStream, writeStream);  // 每次写入完成后才继续下一个分片
        } catch (err) {
            console.error(`Error while merging chunk ${i}`, err);
            throw new Error(`Error while merging chunks: chunk cannot be read`);
        }
    }

    // 删除已合并的分片
    for (let i = 0; i < session.totalChunks; i++) {
        const chunkPath = path.join('.', 'assets/uploads', `${filename}.part${i}`);
        fs.unlinkSync(chunkPath);  // 删除临时分片
    }

    writeStream.close();
};

// 手动将读取的 chunk 写入文件
const writeChunkToFile = async (readStream: fs.ReadStream, writeStream: fs.WriteStream): Promise<void> => {
    return new Promise((resolve, reject) => {
        let chunk;
        
        // 在异步中手动控制流的读取
        function readNextChunk() {
            chunk = readStream.read(1024);  // 每次读取 1KB
            if (chunk) {
                // 尝试写入文件流
                const canWrite = writeStream.write(chunk);
                if (!canWrite) {
                    // 如果写入缓冲区满了，暂停读取流
                    readStream.pause();
                    // 等待缓冲区空闲后继续读取
                    writeStream.once('drain', () => {
                        readNextChunk();  // 缓冲区空闲后继续写入
                    });
                } else {
                    // 如果立即写入成功，继续读取下一个块
                    readNextChunk();
                }
            } else {
                // 如果读取完毕，结束写入流
                readStream.close();
                resolve();
            }
        }

        readStream.on('readable', readNextChunk); // 在流可读取时触发
        readStream.on('error', reject);  // 处理读取流的错误
        writeStream.on('error', reject);  // 处理写入流的错误
    });
};
