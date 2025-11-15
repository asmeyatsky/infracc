# 🔄 Restart Scripts

Easy scripts to restart the development server.

## 🐧 Linux/macOS

Use the bash script:

```bash
./restart.sh
```

Or:

```bash
bash restart.sh
```

## 🪟 Windows (PowerShell)

Use the PowerShell script:

```powershell
.\restart.ps1
```

## 📋 What the Scripts Do

1. **Stop any existing server** on port 3000
2. **Check dependencies** (install if missing)
3. **Start the development server** at http://localhost:3000

## 🚀 Quick Start

### Make Script Executable (Linux/macOS)

```bash
chmod +x restart.sh
```

### Run the Script

**Linux/macOS:**
```bash
./restart.sh
```

**Windows:**
```powershell
.\restart.ps1
```

## 🛠️ Manual Restart

If you prefer to do it manually:

1. **Stop the server**: Press `Ctrl+C` in the terminal where it's running

2. **Kill port 3000** (if needed):
   ```bash
   # Linux/macOS
   lsof -ti:3000 | xargs kill -9
   
   # Windows PowerShell
   Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

## 📝 Alternative: Quick Restart Command

You can also create a simple alias:

**Linux/macOS (.bashrc or .zshrc):**
```bash
alias restart-app='cd /Users/allansmeyatsky/infracc/tco-calculator && ./restart.sh'
```

**Then use:**
```bash
restart-app
```

---

**That's it! The scripts handle everything for you.** 🎉
