# Local Setup Guide

## Quick Start

Get the application running locally in 3 steps:

### 1. Install Dependencies
```bash
cd tco-calculator
npm install
```

### 2. Configure Environment (Optional)
```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your API keys (optional - app works without them)
# REACT_APP_CODEMOD_API_KEY=your-key-here
# REACT_APP_GOOGLE_VISION_API_KEY=your-key-here
```

**Note:** The app works without API keys - it uses mock data automatically.

### 3. Start the Application
```bash
npm start
```

The app will open at: **http://localhost:3000**

---

## Detailed Setup

### Prerequisites

- **Node.js** (v16 or higher recommended)
- **npm** (comes with Node.js)
- **Git** (if cloning)

### Step-by-Step Instructions

#### 1. Navigate to Project Directory
```bash
cd /Users/allansmeyatsky/infracc/tco-calculator
```

#### 2. Install Dependencies
```bash
npm install
```

This will install all required packages:
- React 19
- Bootstrap 5
- Chart.js
- Testing libraries
- And all other dependencies

**Expected time:** 1-3 minutes

#### 3. Environment Configuration (Optional)

The app works without API keys, but you can optionally configure them for enhanced features:

```bash
# Create .env file from template
cp .env.example .env
```

Edit `.env` file and add your keys:
```env
REACT_APP_CODEMOD_API_KEY=your-codemod-api-key-here
REACT_APP_GOOGLE_VISION_API_KEY=your-vision-api-key-here
```

**Where to get API keys:**
- CodeMod API: https://console.cloud.google.com/apis/credentials
- Vision API: https://console.cloud.google.com/apis/credentials

**Note:** Without API keys, the app automatically uses mock data.

#### 4. Start Development Server

```bash
npm start
```

This will:
- Start the React development server
- Open your browser to http://localhost:3000
- Enable hot-reloading (changes reflect immediately)

**Press `Ctrl+C` to stop the server**

---

## Available Commands

### Development
```bash
npm start          # Start development server (http://localhost:3000)
```

### Testing
```bash
npm test           # Run tests in watch mode
```

### Production Build
```bash
npm run build      # Create production build in /build folder
```

---

## Troubleshooting

### Port 3000 Already in Use

If port 3000 is already in use, React will automatically try port 3001, 3002, etc.

Or set a custom port:
```bash
PORT=3001 npm start
```

### Dependencies Installation Issues

If `npm install` fails:

1. **Clear npm cache:**
   ```bash
   npm cache clean --force
   ```

2. **Delete node_modules and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check Node.js version:**
   ```bash
   node --version  # Should be v16 or higher
   ```

### Module Not Found Errors

If you see "Module not found" errors:

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Build Errors

If you encounter build errors:

```bash
# Clear React cache
rm -rf node_modules/.cache
npm start
```

---

## First-Time Usage

Once the app is running:

1. **Discovery Tab** - Start by discovering workloads
   - Click "Discovery" tab
   - Add workloads manually or use demo data
   - Import CSV if you have workload data

2. **Assessment Tab** - Assess discovered workloads
   - Toggle "🤖 Agentic Mode" ON for AI-enhanced assessment
   - Click "Assess All" to assess all workloads

3. **Strategy Tab** - View migration strategy
   - See service mappings
   - View migration waves
   - Check recommendations

4. **Agentic Workflow Tab** - Use autonomous agents
   - Click "🤖 Agentic Workflow" tab
   - Execute individual agents or complete workflow

5. **TCO Calculator** - Calculate costs
   - Enter costs for different cloud providers
   - View TCO comparison and ROI

---

## Project Structure

```
tco-calculator/
├── src/
│   ├── domain/              # Business logic (entities, value objects, services)
│   ├── application/         # Use cases (business operations)
│   ├── infrastructure/      # External adapters (CodeMod, pricing APIs)
│   ├── presentation/        # React components (UI)
│   └── agentic/            # Agentic layer (autonomous agents)
├── public/                  # Static files
├── .env.example            # Environment variables template
├── package.json            # Dependencies and scripts
└── README.md               # Project documentation
```

---

## Next Steps

- **Read Architecture:** See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Use Cases Guide:** See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- **Agentic Features:** See [AGENTIC_INTEGRATION_COMPLETE.md](./AGENTIC_INTEGRATION_COMPLETE.md)
- **Testing:** See [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review error messages in the browser console
3. Check Node.js and npm versions
4. Ensure all dependencies are installed

---

**Happy migrating! 🚀**
