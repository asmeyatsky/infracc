# 🚀 Quick Start - Local Setup

## ✅ Setup Complete!

Your application is starting up!

### What I Did:
1. ✅ Created `.env` file from template
2. ✅ Verified Node.js (v22.17.0) and npm (11.5.2) are installed
3. ✅ Started the development server

### 🌐 Access the App

The app should be available at:
**http://localhost:3000**

The server is starting in the background. It may take 10-30 seconds to fully start.

Your browser should automatically open, or you can manually navigate to:
```
http://localhost:3000
```

---

## 🎯 First Steps

Once the app loads:

### 1. **Discovery Tab** (Start Here)
- Click the **"Discovery"** tab
- Add workloads manually or click **"Load Demo Data"**
- Import CSV if you have workload data

### 2. **Assessment Tab**
- Click **"Assessment"** tab
- Toggle **"🤖 Agentic Mode"** ON (for AI-enhanced assessment)
- Click **"Assess All"** to assess workloads

### 3. **Strategy Tab**
- View migration strategies
- See service mappings (AWS/Azure → GCP)
- Check migration waves

### 4. **🤖 Agentic Workflow Tab** (Try This!)
- Click the **"🤖 Agentic Workflow"** tab
- Execute individual agents or complete autonomous workflow
- Watch agents work autonomously!

### 5. **TCO Calculator**
- Calculate and compare costs
- See ROI analysis

---

## 🔧 Useful Commands

### Stop the Server
Press `Ctrl+C` in the terminal where it's running

### Restart the Server
```bash
cd /Users/allansmeyatsky/infracc/tco-calculator
npm start
```

### Run Tests
```bash
npm test
```

### Build for Production
```bash
npm run build
```

---

## 📝 Environment Variables (Optional)

The `.env` file has been created. You can optionally add API keys:

```bash
# Edit .env file
nano .env  # or use your preferred editor
```

Add your keys:
```env
REACT_APP_CODEMOD_API_KEY=your-key-here
REACT_APP_GOOGLE_VISION_API_KEY=your-key-here
```

**Note:** The app works perfectly without API keys - it uses mock data.

---

## 🐛 Troubleshooting

### Server Not Starting?
1. Check if port 3000 is available:
   ```bash
   lsof -i :3000
   ```

2. Kill any process using port 3000:
   ```bash
   kill -9 $(lsof -t -i:3000)
   ```

3. Restart:
   ```bash
   npm start
   ```

### Module Errors?
```bash
rm -rf node_modules package-lock.json
npm install
npm start
```

### Browser Not Opening?
Manually navigate to: **http://localhost:3000**

---

## 📚 Documentation

- **Setup Guide:** [LOCAL_SETUP.md](./LOCAL_SETUP.md)
- **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Agentic Features:** [AGENTIC_INTEGRATION_COMPLETE.md](./AGENTIC_INTEGRATION_COMPLETE.md)
- **Testing:** [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## ✨ Features to Try

1. **🤖 Agentic Mode** - Toggle in Assessment tab
2. **🤖 Agentic Workflow** - Complete autonomous workflow
3. **Service Mapping** - AWS/Azure to GCP mappings
4. **CodeMod Integration** - Enhanced code analysis
5. **Migration Planning** - Wave planning and strategies

---

**Enjoy exploring the migration tool! 🎉**

If you encounter any issues, check the troubleshooting section or review the documentation.
