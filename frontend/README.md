# EduStream Frontend

React application (Vite + TanStack Router/Start) for Super Admin, Organization Admin, and User workspaces.

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Development server       |
| `npm run build`| Production build         |
| `npm run preview` | Preview production build |

## Environment

| Variable       | Description              | Default                    |
|----------------|--------------------------|----------------------------|
| `VITE_API_URL` | Backend API base URL     | `http://localhost:8000`    |

## Source layout

```text
src/
├── assets/
├── components/     # UI primitives + common building blocks
├── layouts/        # Dashboard shell
├── pages/          # Page components (imported by routes)
├── routes/         # TanStack file-based routes
├── services/       # API client
├── hooks/
├── context/
├── utils/
├── constants/      # theme.ts, env
├── styles/
└── types/
```

Reusable app components live under `components/common/`, `components/sidebar/`, `components/navbar/`, `components/upload/`, etc. Shadcn UI primitives remain in `components/ui/`.
