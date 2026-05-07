import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Mail, Lock, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginInput = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const { login, isLoading, error } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    await login(data.email, data.password);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-rich-black px-4 py-12 relative overflow-hidden">
      {/* Ambient background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-gold-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-gold-accent/3 rounded-full blur-3xl" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-md w-full space-y-8 relative z-10"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center">
          {/* Brand Icon */}
          <motion.div
            className="mx-auto w-16 h-16 rounded-lg bg-near-black border border-gold-accent/30 flex items-center justify-center mb-6"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Mail className="w-8 h-8 text-gold-accent" strokeWidth={1.5} />
          </motion.div>

          <h1 className="text-4xl font-display font-bold text-paper-dark mb-2">
            Bem-vindo
          </h1>
          <p className="text-sm text-paper-dark/60">
            Entre para gerenciar suas finanças com elegância
          </p>
        </motion.div>

        {/* Form Card */}
        <motion.div variants={itemVariants} className="panel-premium">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 rounded-lg border border-burgundy-text/20 bg-burgundy-quiet/10 text-burgundy-text text-sm"
            >
              {/* CORREÇÃO AQUI: Extrai a mensagem se for objeto, ou exibe o texto se for string */}
              {typeof error === 'object' ? (error as any).message : error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Field */}
            <motion.div variants={itemVariants}>
              <label htmlFor="email" className="label-uppercase mb-2 block">
                Email
              </label>
              <div className="relative">
                <Mail
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 text-paper-dark/40`}
                  strokeWidth={1.5}
                />
                <Input
                  id="email"
                  type="email"
                  className="pl-10"
                  placeholder="seu@email.com"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-burgundy-text">
                  {errors.email.message}
                </p>
              )}
            </motion.div>

            {/* Password Field */}
            <motion.div variants={itemVariants}>
              <label htmlFor="password" className="label-uppercase mb-2 block">
                Senha
              </label>
              <div className="relative">
                <Lock
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 text-paper-dark/40`}
                  strokeWidth={1.5}
                />
                <Input
                  id="password"
                  type="password"
                  className="pl-10"
                  placeholder="********"
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-burgundy-text">
                  {errors.password.message}
                </p>
              )}
            </motion.div>

            {/* Submit Button */}
            <motion.div variants={itemVariants} className="pt-4">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Loader2 className="w-4 h-4 mr-2" />
                  </motion.div>
                ) : null}
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </motion.div>
          </form>
        </motion.div>

        {/* Footer */}
        <motion.div variants={itemVariants} className="text-center">
          <p className="text-sm text-paper-dark/60">
            Não tem conta?{" "}
            <Link
              to="/register"
              className="text-gold-accent hover:text-gold-light transition-colors font-medium"
            >
              Crie uma agora
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
