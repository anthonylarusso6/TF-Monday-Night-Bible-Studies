"use client";
import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  onDone: () => void;
}

export default function Toast({ message, onDone }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDone(); }, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!visible) return null;
  return <div className="toast">{message}</div>;
}
