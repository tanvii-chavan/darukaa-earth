const { execSync } = require("child_process");

execSync("docker compose exec -T backend black .", {
  stdio: "inherit",
});

execSync("docker compose exec -T backend flake8 .", {
  stdio: "inherit",
});