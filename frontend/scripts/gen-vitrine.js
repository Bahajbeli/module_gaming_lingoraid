const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, '../src/components/SiteVitrine.js');

const lines = [];
const w = (s) => lines.push(s);

w("import React from 'react';");
w("import { Link } from 'react-router-dom';");
w("import {");
w("  Gamepad2, Grid3x3, Lightbulb, MessageCircle, Dices, Users,");
w("  Trophy, Zap, ArrowRight, Sparkles, Target, ChevronRight,");
w("} from 'lucide-react';");
w("import { motion } from 'framer-motion';");
w("import LingoRaidLogo from './LingoRaidLogo';");
w("");
w("const fadeUp = {");
w("  initial: { opacity: 0, y: 24 },");
w("  whileInView: { opacity: 1, y: 0 },");
w("  viewport: { once: true, margin: '-40px' },");
w("  transition: { duration: 0.5 },");
w("};");
w("");
w("const features = [");
w("  { icon: Target, title: 'Quiz articles', description: 'Maitrisez der, die, das.', color: 'from-blue-500 to-blue-600' },");
w("  { icon: Grid3x3, title: 'Mots croises', description: 'Vocabulaire par niveau.', color: 'from-violet-500 to-violet-600' },");
w("  { icon: Lightbulb, title: 'Creativite', description: 'Exercices visuels.', color: 'from-amber-500 to-orange-500' },");
w("  { icon: MessageCircle, title: 'Simulation', description: 'Dialogues avec IA.', color: 'from-emerald-500 to-teal-600' },");
w("  { icon: Dices, title: 'German Bingo', description: 'Reviser en equipe.', color: 'from-pink-500 to-rose-600' },");
w("  { icon: Users, title: 'Multijoueur', description: 'Salles en ligne.', color: 'from-indigo-500 to-purple-600' },");
w("];");
w("");
w("const steps = [");
w("  { num: '01', title: 'Creez votre compte', text: 'Connexion rapide ou Google.' },");
w("  { num: '02', title: 'Choisissez un jeu', text: 'Gaming Arena.' },");
w("  { num: '03', title: 'Progressez', text: 'Points et niveaux.' },");
w("];");
w("");
w("const SiteVitrine = () => (");
w('  <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">');
w('    <motionFallback />');
w("  </motionFallback>");
w(");");
w("");
w("export default SiteVitrine;");

fs.writeFileSync(out, lines.join('\n'));
console.log('ok');
