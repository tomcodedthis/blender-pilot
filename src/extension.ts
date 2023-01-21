import * as vscode from "vscode";
// import { setPassword, getPassword } from "keytar";
import { Configuration, OpenAIApi } from "openai";

type openAIRequest = {
  model: string;
  prompt: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
};

export async function activate(context: vscode.ExtensionContext) {
  const askForKey = vscode.commands.registerCommand(
    "blender-pilot.goToAPIKey",
    () => goToAPIKey("")
  );

  const goToSettings = vscode.commands.registerCommand(
    "blender-pilot.goToAISettings",
    () => goToAISettings()
  );

  const startSearch = vscode.commands.registerCommand(
    "blender-pilot.startReq",
    async () => {
      const config = vscode.workspace.getConfiguration("Blender-Pilot");
      const key = config.get("API.key") as string;

      if (!key || key.length === 0) {
        return goToAPIKey("I need a key to start!");
      }

      const configuration = new Configuration({ apiKey: key });
      const openai = new OpenAIApi(configuration);

      if (!configuration || !openai) {
        return goToAPIKey("Your API key isn't valid!");
      }

      startRequest(config, openai);
    }
  );

  context.subscriptions.push(askForKey, goToSettings, startSearch);
}

function goToAPIKey(message: string) {
  vscode.window.showWarningMessage(message);
  vscode.commands
    .executeCommand("workbench.action.openSettings", "blender-pilot.API.key")
    .then(() => {
      vscode.commands.executeCommand("workbench.action.openWorkspaceSettings");
    });
}

function goToAISettings() {
  vscode.commands
    .executeCommand("workbench.action.openSettings", "blender-pilot.AI")
    .then(() => {
      vscode.commands.executeCommand("workbench.action.openWorkspaceSettings");
    });
}

function startRequest(
  config: vscode.WorkspaceConfiguration,
  openai: OpenAIApi
) {
  vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification },
    async (progress) => {
      try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          return vscode.window.showErrorMessage(
            "Ensure a text editor window is open!"
          );
        }

        const aiMode = (config.get("AI.prefix") as string) || "GBT3";
        const aiPrefix =
          (config.get("AI.prefix") as string) || "Blender v3.3 Python API";

        progress.report({ message: "What do you need me to do?" });

        await vscode.window
          .showInputBox({
            title: "Input AI Prompt",
            placeHolder: "What can I help you with?",
          })
          .then(async (prompt) => {
            const inputRequest = writeRequest(
              aiMode,
              aiPrefix,
              prompt as string
            );

            progress.report({ message: "Hmm, let me think..." });

            await openai.createCompletion(inputRequest).then((response) => {
              editor.edit((line) => {
                line.insert(
                  editor.selection.end,
                  response.data.choices[0].text as string
                );
              });

              vscode.window.setStatusBarMessage("Here's what I know...", 5000);
            });
          });
      } catch (error: any) {
        vscode.window.showErrorMessage(`${error}`, {
          modal: true,
          detail: `Check your API Key is valid.`,
        });
      }
    }
  );
}

function writeRequest(aiMode: string, aiPrefix: string, prompt: string) {
  const inputPrompt = aiPrefix + " " + prompt;

  let defaultRequest: openAIRequest = {
    model: "text-davinci-003",
    prompt: inputPrompt,
    temperature: 0.6,
    max_tokens: 2048,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  };

  if (aiMode === "Codex") {
    defaultRequest.model = "code-davinci-002";
    defaultRequest.temperature = 0.5;
  }

  return defaultRequest;
}

export function deactivate() {}
