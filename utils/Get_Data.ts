import path from "path"; 
import fs from "fs"; 



// Allows read of local JSON data for AI context
export function Get_Data(){
    const filePath = path.join(process.cwd(), "data", "ai_data.json");
    const fileContents = fs.readFileSync(filePath, "utf8");
    return JSON.parse(fileContents);
}


// Allows OpenAI to read the main prompt template
export function Get_Prompts(context: string){ 
    const PromptPath = path.join(process.cwd(), "prompts", "mainprompt.md"); 
    const PromptTemplate = fs.readFileSync(PromptPath, "utf-8"); 

    return PromptTemplate.replace('${Context Here}', context); 
}