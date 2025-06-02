# 🧪 AI Test Scripts - Command Guide

## 📁 Directory Structure
```
backend/apps/ai_chat/ai_test_scripts/
├── test_django_integration.py      # Main Django integration test
├── test_deployment_handler.py      # Deployment handler specific tests
├── simple_deployment_test.py       # Simple deployment test (no Django)
├── monitor_memory.py               # Real-time memory monitoring
├── verify_deployment_integration.py # Verify deployment integration
├── verify_deployment_ready.py      # Final deployment readiness check
├── test_q8_optimization.py         # Q8_0 model optimization tests
├── optimize_system.py              # System optimization utilities
├── deployment_config.py            # Deployment configuration
└── README_TEST_COMMANDS.md         # This guide
```

## 🚀 How to Run Test Scripts

### ⚠️ IMPORTANT: Always run from the `backend` directory!

**Step 1: Navigate to backend directory**
```bash
cd backend
```

**Step 2: Activate virtual environment**
```bash
source ../env/bin/activate
```

**Step 3: Run any test script using the commands below**

---

## 📋 Test Commands

### 1. 🎯 **Main Django Integration Test** (RECOMMENDED FIRST)
```bash
python apps/ai_chat/ai_test_scripts/test_django_integration.py
```
**What it tests:** Full Django integration with deployment handler, 512 token responses

### 2. 🚀 **Deployment Handler Test**
```bash
python apps/ai_chat/ai_test_scripts/test_deployment_handler.py
```
**What it tests:** Ultra-optimized deployment handler performance and benchmarks

### 3. ⚡ **Simple Deployment Test** (No Django required)
```bash
python apps/ai_chat/ai_test_scripts/simple_deployment_test.py
```
**What it tests:** Basic deployment handler functionality without Django

### 4. 📊 **Memory Monitor** (Real-time monitoring)
```bash
python apps/ai_chat/ai_test_scripts/monitor_memory.py
```
**Options:**
- `--mode monitor` - Continuous monitoring (default)
- `--mode test` - Test model loading with memory tracking
- `--mode pressure` - Memory pressure testing

### 5. ✅ **Verify Deployment Integration**
```bash
python apps/ai_chat/ai_test_scripts/verify_deployment_integration.py
```
**What it tests:** Confirms Django views are using deployment handler

### 6. 🎯 **Final Deployment Readiness Check**
```bash
python apps/ai_chat/ai_test_scripts/verify_deployment_ready.py
```
**What it tests:** Complete system readiness for deployment

### 7. 🔧 **Q8_0 Optimization Test**
```bash
python apps/ai_chat/ai_test_scripts/test_q8_optimization.py
```
**What it tests:** Q8_0 model specific optimizations

### 8. ⚙️ **System Optimization**
```bash
python apps/ai_chat/ai_test_scripts/optimize_system.py
```
**What it does:** System optimization recommendations and checks

---

## 🎯 **Recommended Testing Sequence**

### For First-Time Setup:
```bash
# 1. Basic functionality
python apps/ai_chat/ai_test_scripts/simple_deployment_test.py

# 2. Full Django integration
python apps/ai_chat/ai_test_scripts/test_django_integration.py

# 3. Deployment handler performance
python apps/ai_chat/ai_test_scripts/test_deployment_handler.py

# 4. Final readiness check
python apps/ai_chat/ai_test_scripts/verify_deployment_ready.py
```

### For Ongoing Development:
```bash
# Quick test
python apps/ai_chat/ai_test_scripts/test_django_integration.py

# Memory monitoring (run in separate terminal)
python apps/ai_chat/ai_test_scripts/monitor_memory.py --mode monitor
```

---

## 🐛 Troubleshooting

### Error: "No module named 'django'"
**Solution:** Make sure virtual environment is activated:
```bash
source ../env/bin/activate
```

### Error: "ModuleNotFoundError: No module named 'apps.users'"
**Solution:** Make sure you're running from the `backend` directory:
```bash
cd backend  # Make sure you're here
python apps/ai_chat/ai_test_scripts/[script_name].py
```

### Error: "Model file not found"
**Solution:** Check that the Q8_0 model file exists:
```bash
ls ai_model/tinyllama-1.1b-chat-v1.0.Q8_0.gguf
```

---

## 📊 Expected Results

### ✅ **Successful Test Output Should Show:**
- Memory pressure: low
- Available memory: 7+ GB (on your local machine)
- Model loaded: True
- Context window: 1024 tokens
- Max response tokens: 512 tokens
- Response generation: 2-10 seconds
- Emergency mode: False

### ⚠️ **Warning Signs:**
- Memory pressure: high/critical
- Model initialization failed
- Response times > 15 seconds consistently
- Emergency mode: True

---

## 🎯 **Quick Test Command**
For a fast check that everything is working:
```bash
python apps/ai_chat/ai_test_scripts/simple_deployment_test.py
```

This runs without Django and gives you immediate feedback on the deployment handler status. 