import { Button, EmptyState } from "../ui/index.jsx";

export default function LoginPrompt({ icon, title, description, onGoToLogin }) {
  return (
    <div className="container">
      <EmptyState
        icon={icon}
        title={title}
        description={description}
        action={
          <Button variant="primary" onClick={onGoToLogin}>
            Перейти ко входу
          </Button>
        }
      />
    </div>
  );
}
