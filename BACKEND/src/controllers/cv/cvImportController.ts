import {  Request, Response } from "express";



export const importCVController = (req:Request,res:Response)=>{
    const file = req.file as Express.Multer.File;
    if(!file){
        res.status(400).json({message:"no file uploaded!"})
        return;
    }
    const fileInfo = {
        originalName:file.originalname,
        mimeType: file.mimetype,
        size: file.size
      };

      res.status(200).json({
        message:"File validated successfully. It was not stored.",
        file:fileInfo
      })
    
}