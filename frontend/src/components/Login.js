import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Eye, EyeOff, Shield, UserPlus, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { WORLD_REGIONS } from '../constants/worldRegions';

const Login = () => {
  const { user, loading: authLoading, login, register, googleLogin } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [region, setRegion] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const googleDivRef = useRef(null);
  const googleInitedRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) navigate('/app', { replace: true });
  }, [user, authLoading, navigate]);

  const handleGoogleCallbackRef = useRef();

  useEffect(() => {
    handleGoogleCallbackRef.current = async (response) => {
      const res = await googleLogin(response.credential);
      if (res.success) {
        navigate('/app');
      } else {
        setError(res.error || 'Erreur lors de la connexion avec Google');
      }
    };
  }, [googleLogin, navigate]);

  useEffect(() => {
    const clientId = '964615058500-4sk2747ga4t6gt5if22g0rvrq2aaqtpv.apps.googleusercontent.com';
    const init = () => {
      if (!clientId || !googleDivRef.current || !window.google?.accounts?.id) return;
      try {
        if (!googleInitedRef.current) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
              if (handleGoogleCallbackRef.current) {
                handleGoogleCallbackRef.current(response);
              }
            }
          });
          window.google.accounts.id.renderButton(googleDivRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'pill',
            text: 'signin_with',
            width: 360,
            logo_alignment: 'left'
          });
          googleInitedRef.current = true;
        }
      } catch (e) {
        console.error('Google Auth Init Error:', e);
      }
    };

    if (window.google?.accounts?.id) {
      init();
    } else {
      const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (script) {
        script.addEventListener('load', init, { once: true });
        return () => { script.removeEventListener('load', init); };
      }
    }
  }, []);

  // Empêcher une redirection automatique depuis un 401 pendante qui rechargerait la page en boucle
  useEffect(() => {
    try {
      const original = window.onbeforeunload;
      window.onbeforeunload = null;
      return () => { window.onbeforeunload = original; };
    } catch {}
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isRegister) {
      if (!firstName.trim() || !lastName.trim() || !region) {
        setError('Please enter your first name, last name, and region');
        setLoading(false);
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError('Veuillez entrer une adresse email valide.');
        setLoading(false);
        return;
      }
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
      if (!passwordRegex.test(password)) {
        setError('Le mot de passe doit respecter tous les critères de sécurité.');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
    }

    const result = isRegister
      ? await register({
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          region,
        })
      : await login(email.trim(), password);

    if (result.success || result.requiresVerification) {
      if (result.requiresVerification) {
        setShowVerification(true);
        setVerificationEmail(result.email);
        setError(result.message || 'Veuillez vérifier votre email pour continuer.');
      } else {
        navigate('/app');
      }
    } else {
      const msg = result.error;
      if (msg === 'Network Error' || !result.error) {
        setError(
          'Unable to reach the server. Run « npm run dev » in LingoRaid/backend and ensure port 5000 is free.'
        );
      } else {
        setError(msg);
      }
    }

    setLoading(false);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://backend-u6jh.onrender.com/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail, code: verificationCode })
      });
      const data = await response.json();

      if (response.ok) {
        // Validation réussie, on tente de se reconnecter
        const res = await login(verificationEmail, password);
        if (res.success) {
          navigate('/app');
        } else {
          setError('Email vérifié ! Veuillez vous connecter.');
          setShowVerification(false);
        }
      } else {
        setError(data.error || 'Erreur lors de la vérification.');
      }
    } catch (err) {
      setError('Erreur réseau lors de la vérification.');
    }
    setLoading(false);
  };

  const switchMode = (registerMode) => {
    setIsRegister(registerMode);
    setError('');
    setConfirmPassword('');
    if (!registerMode) {
      setFirstName('');
      setLastName('');
      setRegion('');
    }
  };

  // eslint-disable-next-line no-unused-vars
  const fillDemo = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setConfirmPassword('');
    setError('');
    setIsRegister(false);
  };

  const getPasswordStrength = (pass) => {
    let score = 0;
    if (!pass) return { score: 0, label: '', color: 'bg-gray-200', width: '0%' };
    if (pass.length >= 8) score += 1;
    if (/[a-z]/.test(pass)) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/\d/.test(pass)) score += 1;
    if (/[\W_]/.test(pass)) score += 1;

    if (score <= 2) return { score, label: 'Faible', color: 'bg-red-500', width: `${(score / 5) * 100}%` };
    if (score <= 4) return { score, label: 'Moyen', color: 'bg-yellow-500', width: `${(score / 5) * 100}%` };
    return { score, label: 'Fort', color: 'bg-green-500', width: '100%' };
  };

  const strength = getPasswordStrength(password);
  const criteria = [
    { label: 'Au moins 8 caractères', met: password.length >= 8 },
    { label: 'Une lettre minuscule', met: /[a-z]/.test(password) },
    { label: 'Une lettre majuscule', met: /[A-Z]/.test(password) },
    { label: 'Un chiffre', met: /\d/.test(password) },
    { label: 'Un caractère spécial', met: /[\W_]/.test(password) },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full"
      >
        <motion.div 
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3, type: "spring", stiffness: 200 }}
              className="mx-auto h-20 w-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mb-6"
            >
              <BookOpen className="h-10 w-10 text-white" />
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2"
            >
              LingoRaid
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-gray-600 font-medium"
            >
              {isRegister ? 'Create your account' : 'Sign in to your account'}
            </motion.p>
          </div>

          <motion.div className="flex rounded-xl bg-gray-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => switchMode(false)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                !isRegister ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode(true)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                isRegister ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign up
            </button>
          </motion.div>

        {showVerification ? (
          <motion.form 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6" 
            onSubmit={handleVerify}
          >
            <div className="text-center p-4 bg-blue-50 rounded-xl mb-4">
              <Shield className="h-10 w-10 text-blue-500 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-800">Vérification de l'email</h3>
              <p className="text-sm text-gray-600">Un code a été envoyé à <strong>{verificationEmail}</strong></p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Code de vérification</label>
              <input
                type="text"
                required
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-center tracking-[0.5em] font-mono text-lg uppercase"
                placeholder="XXXXXX"
                maxLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg transition-all duration-200 disabled:opacity-50"
            >
              {loading ? 'Vérification...' : 'Valider mon compte'}
            </button>
            <div className="text-center">
              <button type="button" onClick={() => setShowVerification(false)} className="text-sm text-gray-500 hover:text-gray-800">
                Annuler
              </button>
            </div>
          </motion.form>
        ) : (
          <>
          <motion.form 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="space-y-6" 
            onSubmit={handleSubmit}
          >
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2"
            >
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              {error}
            </motion.div>
          )}

          <motion.div className="space-y-5">
            {isRegister && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                      First name
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      autoComplete="given-name"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                      placeholder="Jean"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">
                      Last name
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      autoComplete="family-name"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                      placeholder="Dupont"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="region" className="block text-sm font-semibold text-gray-700 mb-2">
                    Country / region
                  </label>
                  <select
                    id="region"
                    name="region"
                    required
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-700"
                  >
                    <option value="" disabled>
                      Select your country or region
                    </option>
                    {WORLD_REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                placeholder="votre@email.com"
              />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                  minLength={isRegister ? 6 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              
              {isRegister && (
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-gray-500">Force du mot de passe</span>
                    <span className={strength.color.replace('bg-', 'text-')}>{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${strength.color} transition-all duration-300`} 
                      style={{ width: strength.width }}
                    ></div>
                  </div>
                  <div className="grid grid-cols-1 gap-1 pt-2">
                    {criteria.map((c, i) => (
                      <div key={i} className="flex items-center text-xs">
                        {c.met ? (
                          <Check className="h-3.5 w-3.5 text-green-500 mr-1.5" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-gray-300 mr-1.5" />
                        )}
                        <span className={c.met ? 'text-gray-700' : 'text-gray-400'}>{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {isRegister && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.85 }}
              >
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : isRegister ? (
                <>
                  <UserPlus className="h-5 w-5" />
                  Créer mon compte
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5" />
                  Sign in
                </>
              )}
            </motion.button>
            {isRegister && (
              <p className="mt-3 text-xs text-center text-gray-500">
                Les nouveaux comptes sont créés avec le rôle utilisateur uniquement.
              </p>
            )}
          </motion.div>

        </motion.form>
        <div className="mt-6">
          <div className="text-center text-gray-500 text-sm mb-3">ou</div>
          {/* Bouton Google officiel */}
          <div className="flex justify-center">
            <div ref={googleDivRef} className="w-full flex justify-center" />
          </div>
        </div>
        <p className="mt-6 text-center">
          <Link to="/" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
            Back au site vitrine
          </Link>
        </p>
        </>
        )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
