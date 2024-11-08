
import 'dotenv/config'
import 'openai'
import { type Context, type Action, brainstormIdea, generateVoiceoverFromText, critiqueSections, saveFinalPiece, writeContentSections, writeOutline, generateStoryImage, generateStoryVideo,  } from './actions'
import { prompt, input } from './inputs'

type Workflow = {
    context: Context;
    actions: Action[];
};

// Simulated database
const database = {
    context: { id: "1", prompt: prompt}
}


// Workflow Execution Function
async function executeWorkflow(workflow: Workflow, startingInput: string = '') {
    let input: any = startingInput;

    for (const action of workflow.actions) {
        console.log(`Executing action: ${action.name}`);
        workflow.context = await action.execute(workflow.context, input);
    }
}

// Define Workflow
const storyWorkflow: Workflow = {
    context: database.context,
    actions: [
        brainstormIdea,
        writeOutline,
        writeContentSections,
        saveFinalPiece,
        generateVoiceoverFromText,
        generateStoryImage,
    ],
};


executeWorkflow(storyWorkflow);
