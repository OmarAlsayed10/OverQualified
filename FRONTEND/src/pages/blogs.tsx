import { useEffect, useState } from "react";
import axios from "axios";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Box,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Chip,
  Stack,
  TextField,
  Link,
  CircularProgress,
} from "@mui/material";
import { BLOG_ENDPOINTS } from "../constants/endpoints";
import Seo from "../components/ui/Seo";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  category: string;
}

const PLACEHOLDER =
  "https://res.cloudinary.com/dxvrgy3va/image/upload/w_800,q_auto,f_auto/v1776292968/photo-1499750310107-5fef28a66643_1_nxzft9.jpg";

const Blog = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    axios
      .get(BLOG_ENDPOINTS.list)
      .then(({ data }) => setPosts(data.blogs))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Box sx={{ py: 6, px: { xs: 2, sm: 4, md: 8 }, flex: 1 }}>
      <Seo
        title={t("Career Blog")}
        description={t(
          "Guides on writing an ATS-friendly CV, passing interviews, and changing careers — in Arabic and English."
        )}
      />
      <TextField
        fullWidth
        variant="outlined"
        placeholder={t("searchPlaceholder")}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 4 }}
      />

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
            justifyContent: "center",
            alignItems: "stretch",
          }}
        >
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <Link
                key={post.id}
                component={RouterLink}
                to={`/blogs/${post.slug}`}
                sx={{ textDecoration: "none", flex: "0 1 480px" }}
              >
                <Card
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    width: "100%",
                    height: 400,
                    boxShadow: 3,
                    borderRadius: 2,
                  }}
                >
                  <CardMedia
                    component="img"
                    sx={{ height: 180, objectFit: "cover" }}
                    image={post.coverImage || PLACEHOLDER}
                    alt={post.title}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Chip
                      label={post.category}
                      variant="outlined"
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="h6" color="primary">
                      {post.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      {post.excerpt}
                    </Typography>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      mt={2}
                    ></Stack>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <Box textAlign="center" mt={8} width="100%">
              <Typography variant="h6">{t("noArticles")}</Typography>
              <Typography color="text.secondary">{t("adjustSearch")}</Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default Blog;
