! PyIRBuilder: a thin Grail-side layer over the GsCompilerIRNode builder API,
! shaped for an AST walker.  It tracks the current statement context (method
! or open block), the current lexLevel, and a loop stack so that break /
! continue always target the innermost loop's labels.  It also hides the
! kernel builder bit-rot (see README): selector, selLeaf, envFlags and
! controlOp are set by ivar assignment.
!
! Prototype: lives in UserGlobals, env 0, no source offsets (line numbers
! only).  The production version would live in the Python dictionary, compile
! into env 1, and carry Python source offsets.
!
! No login here -- `input` this file from a logged-in session (00_setup done).

run
(UserGlobals includesKey: #PyIRBuilder) ifFalse: [
  Object subclass: 'PyIRBuilder'
    instVarNames: #(methNode targetClass lexLevel blockStack loopStack curLine)
    classVars: #() classInstVars: #()
    poolDictionaries: {} inDictionary: UserGlobals ].
^ true
%

category: 'instance creation'
classmethod: PyIRBuilder
class: aClass selector: aSelector
  ^ self new initClass: aClass selector: aSelector
%

category: 'initialization'
method: PyIRBuilder
initClass: aClass selector: aSelector
  methNode := GsComMethNode newSmalltalk.
  methNode instVarAt: (GsComMethNode allInstVarNames indexOf: #selector)
    put: aSelector.
  methNode class: aClass.
  methNode fileName: 'PyIRBuilder' source: nil.
  targetClass := aClass.
  lexLevel := 0.
  blockStack := OrderedCollection with: methNode.
  loopStack := OrderedCollection new.
  curLine := 1
%

category: 'building'
method: PyIRBuilder
line: aLineNumber
  curLine := aLineNumber
%

category: 'building'
method: PyIRBuilder
argNamed: aSymbol
  | leaf |
  leaf := GsComVarLeaf new
    methodArg: aSymbol
    argNumber: methNode arguments size + 1.
  methNode appendArg: leaf.
  ^ leaf
%

category: 'building'
method: PyIRBuilder
tempNamed: aSymbol
  | leaf |
  leaf := GsComVarLeaf new methodTemp: aSymbol.
  methNode appendTemp: leaf.
  ^ leaf
%

category: 'building'
method: PyIRBuilder
add: aNode
  "append aNode as a statement in the current context"
  aNode lineNumber isNil ifTrue: [ aNode lineNumber: curLine ].
  blockStack last appendStatement: aNode.
  ^ aNode
%

category: 'nodes'
method: PyIRBuilder
int: anInteger
  ^ (GsComLiteralNode newInteger: anInteger) lineNumber: curLine; yourself
%

category: 'nodes'
method: PyIRBuilder
sym: aSymbol
  ^ (GsComLiteralNode new leaf: (GsComLitLeaf new symbolLiteral: aSymbol))
      lineNumber: curLine; yourself
%

category: 'nodes'
method: PyIRBuilder
obj: anObject
  ^ (GsComLiteralNode newObject: anObject) lineNumber: curLine; yourself
%

category: 'nodes'
method: PyIRBuilder
nilLit
  ^ GsComLiteralNode newNil lineNumber: curLine; yourself
%

category: 'nodes'
method: PyIRBuilder
trueLit
  ^ GsComLiteralNode newTrue lineNumber: curLine; yourself
%

category: 'nodes'
method: PyIRBuilder
var: aVarLeaf
  ^ (GsComVariableNode new leaf: aVarLeaf) lineNumber: curLine; yourself
%

category: 'nodes'
method: PyIRBuilder
selfVar
  ^ GsComVariableNode newSelf lineNumber: curLine; yourself
%

category: 'nodes'
method: PyIRBuilder
global: aSymbol
  "reference a global via its association in the current symbol list"
  | assoc |
  assoc := GsCurrentSession currentSession symbolList
    resolveSymbol: aSymbol.
  assoc isNil ifTrue: [ Error signal: 'unknown global ' , aSymbol ].
  ^ (GsComVariableNode new leaf: (GsComVarLeaf new literalVariable: assoc))
      lineNumber: curLine; yourself
%

category: 'nodes'
method: PyIRBuilder
send: aSelector to: rcvrNode with: argNodes
  "a non-optimized send; selLeaf = bare Symbol (stSelector: is broken, README)"
  | s |
  s := GsComSendNode new.
  s rcvr: rcvrNode.
  s instVarAt: (GsComSendNode allInstVarNames indexOf: #selLeaf) put: aSelector.
  s instVarAt: (GsComSendNode allInstVarNames indexOf: #envFlags) put: 0.
  argNodes do: [:a | s appendArgument: a ].
  s lineNumber: curLine.
  ^ s
%

category: 'nodes'
method: PyIRBuilder
assign: aVarLeaf from: aNode
  ^ (GsComAssignmentNode new dest: aVarLeaf source: aNode)
      lineNumber: curLine; yourself
%

category: 'nodes'
method: PyIRBuilder
return: aNode
  ^ (GsComReturnNode new return: aNode) lineNumber: curLine; yourself
%

category: 'control'
method: PyIRBuilder
inBlockDo: aZeroArgBlock
  "open a GsComBlockNode context, run the builder block, close; answer the node"
  | blk |
  lexLevel := lexLevel + 1.
  blk := GsComBlockNode new lexLevel: lexLevel.
  blk lineNumber: curLine.
  blockStack addLast: blk.
  aZeroArgBlock value.
  blockStack removeLast.
  blk lastLineNumber: curLine.
  lexLevel := lexLevel - 1.
  ^ blk
%

category: 'control'
method: PyIRBuilder
if: condNode then: aZeroArgBlock
  "add:  (cond) ifTrue: [ ...statements built by aZeroArgBlock... ]"
  | ifSend |
  ifSend := self send: #ifTrue: to: condNode
    with: { self inBlockDo: aZeroArgBlock }.
  ifSend
    instVarAt: (GsComSendNode allInstVarNames indexOf: #controlOp)
    put: (GsCompilerIRNode _classVars at: #COMPAR__IF_TRUE).
  ^ self add: ifSend
%

category: 'control'
method: PyIRBuilder
while: aCondNodeBlock do: aBodyBlock
  "add a Python-shaped while loop.  aCondNodeBlock answers the condition
   node; aBodyBlock builds the body statements.  break / continue inside
   aBodyBlock target THIS loop."
  | breakLab contLab condBlk bodyBlk whileSend loop |
  breakLab := GsComLabelNode new lexLevel: lexLevel argForValue: true.
  contLab := GsComLabelNode new lexLevel: lexLevel + 1 argForValue: false.
  loopStack addLast: breakLab -> contLab.
  condBlk := self inBlockDo: [ self add: aCondNodeBlock value ].
  bodyBlk := self inBlockDo: [
    aBodyBlock value.
    self add: contLab ].
  loopStack removeLast.
  whileSend := self send: #whileTrue: to: condBlk with: { bodyBlk }.
  whileSend
    instVarAt: (GsComSendNode allInstVarNames indexOf: #controlOp)
    put: (GsCompilerIRNode _classVars at: #COMPAR_WHILE_TRUE).
  loop := GsComLoopNode new.
  loop send: whileSend; breakLabel: breakLab.
  loop lineNumber: curLine.
  ^ self add: loop
%

category: 'control'
method: PyIRBuilder
break
  | brk |
  loopStack isEmpty ifTrue: [ Error signal: 'break outside a loop' ].
  brk := GsComGotoNode new.
  brk localRubyBreak: loopStack last key.
  brk argNode: self nilLit.
  brk lineNumber: curLine.
  ^ self add: brk
%

category: 'control'
method: PyIRBuilder
continue
  | cont |
  loopStack isEmpty ifTrue: [ Error signal: 'continue outside a loop' ].
  cont := GsComGotoNode new.
  cont localRubyNext: loopStack last value argForValue: false.
  cont lineNumber: curLine.
  ^ self add: cont
%

category: 'generation'
method: PyIRBuilder
install
  "generate and install in the target class (env 0); answer the GsNMethod"
  | meth |
  meth := GsNMethod generateFromIR: methNode.
  (meth isKindOf: GsNMethod) ifFalse: [
    Error signal: 'generateFromIR failed: ' , meth printString ].
  (targetClass persistentMethodDictForEnv: 0)
    at: methNode selector put: meth.
  Behavior _clearLookupCaches: 0.
  ^ meth
%
