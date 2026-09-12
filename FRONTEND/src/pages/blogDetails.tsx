import { useEffect, useState } from "react";
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";
import axios from "axios";
import {
  Container,
  Typography,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Paper,
  Alert,
  Link,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import i18n from "../i18n";
import { useTranslation } from "react-i18next";
import { BLOG_ENDPOINTS } from "../constants/endpoints";
import Seo from "../components/ui/Seo";
import { useAuth } from "../hooks/useAuth";
import { COLORS } from "../theme/tokens";

interface BlogPost {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  coverImage: string | null;
  views: number;
  createdAt: string;
}

interface BlogComment {
  id: string;
  displayName: string;
  content: string;
  createdAt: string;
}

const PLACEHOLDER =
  "https://res.cloudinary.com/dxvrgy3va/image/upload/w_800,q_auto,f_auto/v1776292968/photo-1499750310107-5fef28a66643_1_nxzft9.jpg";

const renderBlock = (block: string, index: number) => {
  if (block.startsWith("## ")) {
    return (
      <Typography key={index} variant="h5" fontWeight={700} sx={{ mt: 4, mb: 1.5 }}>
        {block.slice(3)}
      </Typography>
    );
  }
  if (block.startsWith("- ")) {
    return (
      <Box key={index} component="ul" sx={{ pl: 3, my: 1.5, "& li": { mb: 0.75, lineHeight: 1.8 } }}>
        {block.split("\n").map((item, i) => <li key={i}>{item.replace(/^- /, "")}</li>)}
      </Box>
    );
  }
  return (
    <Typography key={index} variant="body1" sx={{ mb: 2, lineHeight: 1.8, whiteSpace: "pre-line" }}>
      {block}
    </Typography>
  );
};

const BlogDetail = () => {
  const { t } = useTranslation();
  const currentLang = i18n.language;
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [commentError, setCommentError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setSubmitted(false);
    axios
      .get(BLOG_ENDPOINTS.bySlug(id))
      .then(({ data }) => setBlogPost(data.blog))
      .catch(() => setBlogPost(null))
      .finally(() => setLoading(false));
    axios
      .get(BLOG_ENDPOINTS.comments(id))
      .then(({ data }) => setComments(data.comments))
      .catch(() => setComments([]));
    const viewKey = `blog-viewed:${id}`;
    if (!sessionStorage.getItem(viewKey)) {
      sessionStorage.setItem(viewKey, "1");
      axios.post(BLOG_ENDPOINTS.view(id)).catch(() => null);
    }
  }, [id]);

  const submitComment = async () => {
    if (!id || draft.trim().length < 3) return;
    setSubmitting(true);
    setCommentError("");
    try {
      await axios.post(BLOG_ENDPOINTS.comments(id), { content: draft.trim() }, { withCredentials: true });
      setDraft("");
      setSubmitted(true);
    } catch (error: any) {
      setCommentError(error.response?.data?.message || t("Could not post your comment. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

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

  const blocks = blogPost.content.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  return (
    <Container maxWidth="md" sx={{ mt: 5, mb: 10 }}>
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
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Chip label={blogPost.category} variant="outlined" />
          <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <VisibilityOutlinedIcon sx={{ fontSize: 16 }} /> {blogPost.views.toLocaleString()} {t("views")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {new Date(blogPost.createdAt).toLocaleDateString(currentLang === "ar" ? "ar-EG" : "en-GB", { year: "numeric", month: "short", day: "numeric" })}
          </Typography>
        </Stack>
        <Typography variant="h4" fontWeight="bold" mt={2}>
          {blogPost.title}
        </Typography>
      </Box>

      <Box mt={4}>{blocks.map(renderBlock)}</Box>

      <Box mt={8}>
        <Typography variant="h5" fontWeight={700} mb={3}>
          {t("Comments")} ({comments.length})
        </Typography>

        <Stack spacing={2} mb={4}>
          {comments.map((comment) => (
            <Paper key={comment.id} elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${COLORS.borderLight}` }}>
              <Stack direction="row" justifyContent="space-between" mb={0.75}>
                <Typography fontWeight={700}>{comment.displayName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </Typography>
              </Stack>
              <Typography sx={{ whiteSpace: "pre-line" }}>{comment.content}</Typography>
            </Paper>
          ))}
          {comments.length === 0 && (
            <Typography color="text.secondary">{t("No comments yet. Be the first to share your thoughts.")}</Typography>
          )}
        </Stack>

        {user ? (
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${COLORS.borderLight}` }}>
            <Typography fontWeight={700} mb={1.5}>{t("Leave a comment")}</Typography>
            {submitted && <Alert severity="success" sx={{ mb: 2 }}>{t("Thanks! Your comment will appear once an admin approves it.")}</Alert>}
            {commentError && <Alert severity="error" sx={{ mb: 2 }}>{commentError}</Alert>}
            <TextField
              fullWidth
              multiline
              minRows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("Write your comment...")}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
            />
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1.5 }}>
              <Button variant="contained" onClick={submitComment} disabled={submitting || draft.trim().length < 3}>
                {submitting ? <CircularProgress size={18} color="inherit" /> : t("Post comment")}
              </Button>
            </Box>
          </Paper>
        ) : (
          <Typography color="text.secondary">
            <Link component={RouterLink} to="/getStart">{t("Log in")}</Link> {t("to leave a comment.")}
          </Typography>
        )}
      </Box>
    </Container>
  );
};

export default BlogDetail;
