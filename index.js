const { Project, SyntaxKind } = require("ts-morph");
const { camelCase } = require("lodash");
const { writeFileSync } = require("fs")

const paths = ["/home/justin/fica-service/tsconfig.json", "/home/justin/fica-service/stacks/MicroserviceStack.ts"] 

const changes = []

const funcName = (handler) => {
  //'src/handler-http-update-verifications-override-by-owner.handler'
  const start = "src/handler-".length + 1; 
  const end = handler.length - ".handler".length - 1;
  const functionName = "fica-${this.stage}-".concat(camelCase(handler.substring(start, end))) ;
  changes.push(`"${handler.replace(/'/g, '')}", "${functionName}"`)
  return  functionName
};

const logKindAndText = (child) => {
  console.log(
    child.getStartLineNumber(),
    `. `,
    child.getKindName(),
    `: `,
    child.getText()
  );
};

const project = new Project({
  tsConfigFilePath: paths[0],
  skipAddingFilesFromTsConfig: true,
});
project.addSourceFilesAtPaths(
  paths[1]
);

const sourceFiles = project.getSourceFiles();
console.log(`sourceFiles`, sourceFiles.length);
const [target] = sourceFiles;
target.forEachDescendant((node) => {
  if (node.getKindName() === "ObjectLiteralExpression") {
    node.forEachChild((child) => {
      if (child.getText().startsWith("function:")) {
        console.log("-------------------------------------------------");
        child.forEachChild((funcLitChild) => {
          logKindAndText(funcLitChild);
          if (funcLitChild.getKindName() === "StringLiteral") {
            console.log("-->");
           
            const handler = funcLitChild.getText()
            const fn = funcName(handler);
            console.log(
              `handler`,
              handler,
              `, functionName: `,
              fn
            );
            funcLitChild.replaceWithText(`{
              handler: ${handler},
              functionName: \`${fn}\`,
            }`)
          } else if (funcLitChild.getKindName() === "ObjectLiteralExpression") {
            const obj = funcLitChild;
            obj.forEachChild((funcLitObjChild) => {
              logKindAndText(funcLitObjChild);
              console.log("-->");
              const [handler] = funcLitObjChild.getChildrenOfKind(
                SyntaxKind.StringLiteral
              );
              if (handler) {
                const handlerStr = handler.getText()
                const fn = funcName(handlerStr);
                console.log(
                  `handler`,
                  handlerStr,
                  `, functionName: `,
                  fn
                );
                obj.replaceWithText(`{
                  handler: ${handlerStr},
                  functionName: \`${fn}\`',
                }`)
              }
            });
          }
        });
      }
    });
  }
});
writeFileSync(`/home/justin/fica-service/function-name-changes.csv`, changes.join('\n'));
project.save();
