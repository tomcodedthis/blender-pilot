import * as vscode from "vscode";
import { setPassword, getPassword } from "keytar";
import { Configuration, OpenAIApi } from "openai";

export async function activate(context: vscode.ExtensionContext) {
  const setAPI = vscode.commands.registerCommand(
    "blender-pilot.setAPI",
    async () => {
      await vscode.window
        .showInputBox({
          title: "Set API Key",
          placeHolder: "Enter your Open API Key here...",
        })
        .then((key) => {
          setAPIKey(key as string);
        });
    }
  );

  const sendRequest = vscode.commands.registerCommand(
    "blender-pilot.sendReq",
    async () => {
      vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification },
        async (progress) => {
          try {
            const key = await getAPIKey();
            const configuration = new Configuration({ apiKey: key });
            const openai = new OpenAIApi(configuration);
            const editor = vscode.window.activeTextEditor;

            if (!key) {
              vscode.window.showErrorMessage(
                "Please enter a valid OpenAI API key."
              );
              vscode.window.showInputBox({});
            }
            if (!editor) {
              return vscode.window.showErrorMessage(
                "Ensure a text editor window is open!"
              );
            }

            progress.report({ message: "Please enter a prompt..." });

            await vscode.window
              .showInputBox({
                title: "Input AI Prompt",
                placeHolder: "Enter Blender Python Prompt here...",
              })
              .then(async (prompt) => {
                progress.report({ message: "Fetching data response..." });

                await openai
                  .createCompletion({
                    model: "text-davinci-003",
                    prompt: "blender v3.3 python API " + prompt,
                    temperature: 0.8,
                    max_tokens: 2048,
                    top_p: 1,
                    frequency_penalty: 0,
                    presence_penalty: 0,
                  })
                  .then((response) => {
                    if (editor) {
                      editor.edit((line) => {
                        line.insert(
                          editor.selection.end,
                          response.data.choices[0].text as string
                        );
                      });

                      vscode.window.setStatusBarMessage("Success!", 5000);
                    }
                  });
              });
          } catch (error: any) {
            vscode.window.showErrorMessage(`${error}`);
          }
        }
      );
    }
  );

  context.subscriptions.push(setAPI, sendRequest);
}

async function setAPIKey(key: string) {
  await setPassword("blender-pilot", "OPENAI_API_KEY", key).then(() => {
    vscode.window.setStatusBarMessage("OpenAI API Key Set", 5000);
  });
}

async function getAPIKey() {
  return (await getPassword("blender-pilot", "OPENAI_API_KEY")) as string;
}

export function deactivate() {}
