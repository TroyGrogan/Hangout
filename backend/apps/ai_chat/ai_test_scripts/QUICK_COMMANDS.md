# 🚀 Quick Test Commands

## 📍 **ALWAYS RUN FROM:** `backend` directory with virtual environment activated

```bash
cd backend
source ../env/bin/activate
```

## ⚡ **Most Common Commands**

### 🎯 **Quick Test** (No Django, 30 seconds)
```bash
python apps/ai_chat/ai_test_scripts/simple_deployment_test.py
```

### 🔥 **Full Django Test** (With model loading, 2-3 minutes)
```bash
python apps/ai_chat/ai_test_scripts/test_django_integration.py
```

### 📊 **Memory Monitor** (Real-time, run in separate terminal)
```bash
python apps/ai_chat/ai_test_scripts/monitor_memory.py
```

### ✅ **Deployment Ready Check**
```bash
python apps/ai_chat/ai_test_scripts/verify_deployment_ready.py
```

---

## 🎯 **Expected Results**
- ✅ Memory pressure: **low**
- ✅ Context window: **1024 tokens**
- ✅ Max response: **512 tokens**
- ✅ Response time: **2-10 seconds**
- ✅ Model loaded: **True**

---

## 🐛 **If Something Fails**
1. Check virtual environment: `source ../env/bin/activate`
2. Check you're in backend directory: `pwd` should end with `/backend`
3. Check model file exists: `ls ai_model/tinyllama-1.1b-chat-v1.0.Q8_0.gguf` 