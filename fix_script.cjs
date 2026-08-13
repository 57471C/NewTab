const fs = require('fs');
const filepath = 'src/hooks/useStreamingChat.ts';
let code = fs.readFileSync(filepath, 'utf-8');

const oldLogic = `				if (hasUpdates) {
					pendingContent = assistantContent;
					if (!isUpdating) {
						isUpdating = true;
						updatePromise = updatePromise.then(async () => {
							const contentToUpdate = pendingContent;
							await database.messages.update(assistantMsgId, {
								content: contentToUpdate,
							});
							isUpdating = false;
						});
					}
				}`;

const newLogic = `				if (hasUpdates) {
					pendingContent = assistantContent;
					if (!isUpdating) {
						isUpdating = true;
						updatePromise = updatePromise.then(async () => {
							while (true) {
								const currentContent = pendingContent;
								try {
									await database.messages.update(assistantMsgId, {
										content: currentContent,
									});
								} catch (e) {
									console.error("Stream DB write error:", e);
								}
								if (pendingContent === currentContent) {
									isUpdating = false;
									break;
								}
							}
						});
					}
				}`;

if (code.includes(oldLogic)) {
    code = code.replace(oldLogic, newLogic);
    fs.writeFileSync(filepath, code);
    console.log("Replaced logic.");
} else {
    console.log("Old logic not found.");
}
