import { Request, Response } from "express";
import { generateChatResponse } from "./chatBotService";
import { CustomRequest } from "../../middleware/validateJWTMiddleware";
import prisma from "../../lib/prisma";

const chatBotController = async (req: Request, res: Response) => {
  const { message, chatId } = req.body;
  const customReq = req as CustomRequest;

  if (!customReq.user?.userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (!message) {
    res.status(400).json({ message: "Message is required" });
    return;
  }

  if (!chatId) {
    res.status(400).json({ message: "ChatId is required" });
    return;
  }

  const chat = await prisma.chat.findUnique({ where: { id: chatId } });

  if (!chat) {
    res.status(404).json({ message: "Chat not found" });
    return;
  }

  if (chat.userId !== customReq.user.userId) {
    res.status(403).json({ message: "Not authorized to access this chat" });
    return;
  }

  const response = await generateChatResponse(message, chatId);

  // Atomic jsonb append — concurrent messages to the same chat serialize at the DB
  // and can't clobber each other's write (a read-modify-write would lose one).
  const appended = JSON.stringify([
    { type: "user", content: message },
    { type: "bot", content: response as string },
  ]);
  await prisma.$executeRaw`UPDATE "Chat" SET messages = messages || ${appended}::jsonb WHERE id = ${chatId}`;

  res.status(200).json({ response });
};

const createChatController = async (req: Request, res: Response) => {
  const customReq = req as CustomRequest;

  if (!customReq.user?.userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const newChat = await prisma.chat.create({
    data: {
      userId: customReq.user.userId,
      messages: [],
    },
  });

  res.status(201).json(newChat);
};

const getChatHistoryController = async (req: Request, res: Response) => {
  const customReq = req as CustomRequest;

  if (!customReq.user?.userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const chats = await prisma.chat.findMany({
    where: { userId: customReq.user.userId },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json(chats);
};

export { chatBotController, createChatController, getChatHistoryController };