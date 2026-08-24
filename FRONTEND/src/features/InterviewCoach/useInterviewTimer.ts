import { useEffect, useState } from "react";
import { InterviewSession } from "./interviewCoach.types";

export const useInterviewTimer = (session: InterviewSession, paused: boolean) => {
  const [remainingSeconds, setRemainingSeconds] = useState(session.remainingSeconds);

  useEffect(() => {
    setRemainingSeconds(session.remainingSeconds);
  }, [session.id, session.remainingSeconds, session.updatedAt]);

  const timerStopped = remainingSeconds === null || remainingSeconds === 0 || session.status !== "active";

  useEffect(() => {
    if (paused || timerStopped) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => current === null ? null : Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [paused, timerStopped]);

  return remainingSeconds;
};

export const formattedInterviewTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
};
