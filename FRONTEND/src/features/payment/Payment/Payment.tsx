import {
  Box,
  Container,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePayment } from "../hooks/usePayment";
import { PlanSummaryCards } from "../components/PlanSummaryCards";
import { InstapayDetailsCard } from "../components/InstapayDetailsCard";
import CreditPurchaseCards from "../components/CreditPurchaseCards";
import { CreditCardForm } from "../components/CreditCardForm";
import { PaymentStatusCard } from "../components/PaymentStatusCard";
import { COLORS, RADIUS, TYPOGRAPHY } from "../../../theme/tokens";

import { useFeedback } from "../../../context/FeedbackContext";
const PLAN_STEPS = ["Select Plan", "Payment Details", "Submit Proof", "Status"];
const CREDIT_STEPS = ["Select Credits", "Payment Details", "Submit Proof", "Status"];
const STEP_INDEX: Record<string, number> = {
  "select-plan": 0,
  "instapay-details": 1,
  submit: 2,
  status: 3,
};

interface PaymentProps {
  purchaseMode?: "plan" | "credits";
}

const Payment = ({ purchaseMode = "plan" }: PaymentProps) => {
  const { t } = useTranslation();
  const { notify } = useFeedback();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));
  const {
    step,
    plans,
    plansLoading,
    selectedPlan,
    instapayDetails,
    detailsLoading,
    referenceNumber,
    setReferenceNumber,
    screenshot,
    fileError,
    refError,
    submitLoading,
    paymentStatus,
    statusLoading,
    error,
    handleSelectPlan,
    handleContinueToSubmit,
    handleScreenshotChange,
    handleSubmit,
    handleSelectCustomQuote,
    handleBack,
    handleRetry,
  } = usePayment();
  useEffect(() => {
    if (error) notify(error);
  }, [error, notify]);


  const isCreditPurchase = purchaseMode === "credits";
  const steps = isCreditPurchase ? CREDIT_STEPS : PLAN_STEPS;
  const activeStep = STEP_INDEX[step];

  return (
    <Box sx={{ background: COLORS.bgLight, minHeight: "100vh", py: 6 }}>

      <Container maxWidth="lg">
        <Paper
          elevation={0}
          sx={{
            borderRadius: RADIUS.xl,
            border: `1px solid rgba(26,26,24,0.1)`,
            overflow: "hidden",
            bgcolor: COLORS.bgWhite,
          }}
        >
          {/* Header */}
          <Box sx={{ p: { xs: 2.5, sm: 4 }, pb: 0 }}>
            <Typography
              variant="h5"
              sx={{
                fontFamily: TYPOGRAPHY.fontSerif,
                color: COLORS.textPrimary,
                mb: 1,
              }}
            >
              {t(isCreditPurchase ? 'Buy credits' : 'Choose a plan')}
            </Typography>
            <Stepper activeStep={activeStep} orientation={mobile ? "vertical" : "horizontal"} sx={{ mb: 3 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel
                    sx={{
                      "& .MuiStepLabel-label": { fontSize: "0.75rem" },
                      "& .MuiStepIcon-root.Mui-active": { color: COLORS.primary },
                      "& .MuiStepIcon-root.Mui-completed": { color: COLORS.primary },
                    }}
                  >
                    {t(label)}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* Body */}
          <Box sx={{ p: { xs: 2.5, sm: 4 } }}>
            {step === "select-plan" && (
              isCreditPurchase ? (
                <CreditPurchaseCards
                  plans={plans}
                  selectedPlanId={selectedPlan?.id ?? null}
                  onSelectPlan={handleSelectPlan}
                  onSelectCustom={handleSelectCustomQuote}
                />
              ) : (
                <>
                  <Typography
                    variant="body2"
                    sx={{ color: COLORS.textSecondary, mb: 2 }}
                  >
                    {t('Choose the plan that fits your job search timeline.')}
                  </Typography>
                  <PlanSummaryCards
                    plans={plans.filter((plan) => plan.kind !== "topup")}
                    loading={plansLoading}
                    selectedPlanId={selectedPlan?.id ?? null}
                    onSelect={handleSelectPlan}
                  />
                </>
              )
            )}

            {step === "instapay-details" && (
              <>

                <Typography
                  variant="body2"
                  sx={{ color: COLORS.textSecondary, mb: 2 }}
                >
                  {t('Open your InstaPay app and transfer the exact amount shown below.')}
                </Typography>
                <InstapayDetailsCard
                  details={instapayDetails}
                  loading={detailsLoading}
                  onContinue={handleContinueToSubmit}
                  onBack={handleBack}
                />
              </>
            )}

            {step === "submit" && (
              <>
                <Typography
                  variant="body2"
                  sx={{ color: COLORS.textSecondary, mb: 2 }}
                >
                  {t('Enter the reference number from your InstaPay transfer and upload a screenshot as proof.')}
                </Typography>
                <CreditCardForm
                  referenceNumber={referenceNumber}
                  onReferenceChange={setReferenceNumber}
                  screenshot={screenshot}
                  onScreenshotChange={handleScreenshotChange}
                  refError={refError}
                  fileError={fileError}
                  loading={submitLoading}
                  onSubmit={handleSubmit}
                  onBack={handleBack}
                />
              </>
            )}

            {step === "status" && (
              <PaymentStatusCard
                status={paymentStatus}
                loading={statusLoading}
                onRetry={handleRetry}
              />
            )}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Payment;
