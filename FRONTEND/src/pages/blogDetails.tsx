import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Container, Typography, Box, Button, Chip, CircularProgress } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import i18n from "../i18n";
import { useTranslation } from "react-i18next";
import { BLOG_ENDPOINTS } from "../constants/endpoints";
import Seo from "../components/ui/Seo";

interface BlogPost {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  coverImage: string | null;
}

const PLACEHOLDER =
  "https://res.cloudinary.com/dxvrgy3va/image/upload/w_800,q_auto,f_auto/v1776292968/photo-1499750310107-5fef28a66643_1_nxzft9.jpg";

const BlogDetail = () => {
  const { t } = useTranslation();
  const currentLang = i18n.language;
  const navigate = useNavigate();
  const { id } = useParams();

  const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    axios
      .get(BLOG_ENDPOINTS.bySlug(id))
      .then(({ data }) => setBlogPost(data.blog))
      .catch(() => setBlogPost(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!blogPost) {
    return <Typography variant="h6" sx={{ mt: 5, textAlign: "center" }}>{t("Blog post not found.")}</Typography>;
  }

  return (
    <Container maxWidth="md" sx={{ mt: 5 }}>
      <Seo title={blogPost.title} description={blogPost.excerpt} />
      <Button
        variant="text"
        startIcon={currentLang === "en" ? <ArrowBackIcon /> : <ArrowForwardIcon sx={{ px: 1 }} />}
        onClick={() => navigate("/blogs")}
        sx={{ mb: 3 }}
      >
        {t("Back to Blog")}
      </Button>

      <Box
        sx={{
          position: "relative",
          width: "100%",
          maxWidth: "800px",
          aspectRatio: "16 / 9",
          margin: "0 auto",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <Box
          component="img"
          src={blogPost.coverImage || PLACEHOLDER}
          alt={blogPost.title}
          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Box>

      <Box mt={3}>
        <Chip label={blogPost.category} variant="outlined" />
        <Typography variant="h4" fontWeight="bold" mt={2}>
          {blogPost.title}
        </Typography>
      </Box>

      <Box mt={4}>
        {blogPost.content
          .split("\n")
          .filter((line: string) => line.trim() !== "")
          .map((paragraph: string, index: number) => (
            <Typography variant="body1" paragraph key={index}>
              {paragraph}
            </Typography>
          ))}
      </Box>
    </Container>
  );
};

export default BlogDetail;
