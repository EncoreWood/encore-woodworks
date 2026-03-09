import { motion } from "framer-motion";

export default function PageSlideWrapper({ children }) {
  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
      style={{ willChange: "transform" }}
    >
      {children}
    </motion.div>
  );
}