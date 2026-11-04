import { createAuthClient } from "better-auth/react";
import {
  inferAdditionalFields,
  usernameClient,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  sessionOptions: { refetchInterval: 60 },
  plugins: [
    usernameClient(),
    inferAdditionalFields({
      user: {
        role: {
          type: "string",
          required: true,
          defaultValue: "user",
          input: false,
        },
      },
    }),
  ],
});
