import { Request, Response } from "express";
import exportWordCV from "../../services/exportDocxService";
import prisma from "../../lib/prisma";
import { CustomRequest } from "../../middleware/validateJWTMiddleware";


type CVData = {
    personalInfo: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        location: string;
        professionalTitle: string;
        ProfessionalSummary: string;
        linkedin?: string;
        github?: string;
        portfolio?: string;
    };
    experience: {
        jobTitle: string;
        company: string;
        location: string;
        startDate: string | Date;
        endDate: string | Date;
        description: string;
    }[];
    education: {
        institution: string;
        degree: string;
        location: string;
        startYear: string | Date;
        endYear: string | Date;
        description: string;
    }[];
    skills: {
        skills?: string[];
        languages?: string | string[];
        certifications?: unknown;
    };
};

export const exportCVController = async (req: Request, res: Response) => {
    try {
        const userId = (req as CustomRequest).user!.userId;

        const cv = await prisma.cV.findUnique({
            where: { id: req.params.cvId },
        });

        if (!cv || cv.userId !== userId) {
            res.status(404).json({ message: "CV not found!" });
            return;
        }

        // cast Json fields to proper typed object
        const plainCV = cv as unknown as CVData;

        const format = req.query.format?.toString().toLowerCase() || "word";

        if (format === "word") {
            const buffer = await exportWordCV(plainCV);

            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
            res.setHeader("Content-Disposition", `attachment; filename="${plainCV.personalInfo.firstName.replace(/\s+/g, "-") || "cv"}_CV.docx"`);

            res.send(buffer);
            return;
        }

        res.status(400).json({ message: "Unsupported format, only PDF & Word are allowed" });
        return;

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Export failed!" });
        return;
    }
};