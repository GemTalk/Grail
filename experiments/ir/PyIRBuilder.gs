! PyIRBuilder: a thin Grail-side layer over the GsCompilerIRNode builder API,
! shaped for an AST walker.  It tracks the current statement context (method
! or open block), the current lexLevel, and a loop stack so that break /
! continue always target the innermost loop's labels.  It also hides the
! kernel builder bit-rot (see README): selector, selLeaf, envFlags and
! controlOp are set by ivar assignment.
!
! Now carries the two things the production seam needs (MIGRATION.md step 1):
!   * ENVIRONMENT: install into env 1 (where Grail's Python methods live) as
!     well as env 0.  `class:selector:` still defaults to env 0 for the older
!     experiments; `class:selector:env:` selects the environment.
!   * SOURCE OFFSETS: `fileName:source:` attaches the Python text, and `at:`
!     sets a 1-based Python character offset that is stamped onto every node
!     built after it (falling back to `line:` when no offset is set).  This is
!     what makes step points and tracebacks speak Python natively.
!
! No login here -- `input` this file from a logged-in session (00_setup done).

run
(UserGlobals includesKey: #PyIRBuilder) ifTrue: [ UserGlobals removeKey: #PyIRBuilder ].
Object subclass: 'PyIRBuilder'
  instVarNames: #(methNode targetClass env lexLevel blockStack loopStack curLine curOffset)
  classVars: #() classInstVars: #()
  poolDictionaries: {} inDictionary: UserGlobals.
^ true
%

category: 'instance creation'
classmethod: PyIRBuilder
class: aClass selector: aSelector
  ^ self class: aClass selector: aSelector env: 0
%

category: 'instance creation'
classmethod: PyIRBuilder
class: aClass selector: aSelector env: anEnvId
  ^ self new initClass: aClass selector: aSelector env: anEnvId
%

category: 'initialization'
method: PyIRBuilder
initClass: aClass selector: aSelector env: anEnvId
  methNode := GsComMethNode newSmalltalk.
  methNode instVarAt: (GsComMethNode allInstVarNames indexOf: #selector)
    put: aSelector.
  methNode class: aClass.
  "envInfo = bodyEnv | (selectorEnv << 8); both are anEnvId (comparse.ht)"
  methNode instVarAt: (GsComMethNode allInstVarNames indexOf: #envInfo)
    put: (anEnvId bitOr: (anEnvId bitShift: 8)).
  methNode fileName: 'PyIRBuilder' source: nil.
  targetClass := aClass.
  env := anEnvId.
  lexLevel := 0.
  blockStack := OrderedCollection with: methNode.
  loopStack := OrderedCollection new.
  curLine := 1.
  curOffset := nil
%

category: 'building'
method: PyIRBuilder
fileName: aName source: aString
  "attach the Python source text; node srcOffsets point into it.  The method's
   own source begins at offset 1 of this string, so the methNode's srcOffset
   MUST be 1: codegen's initSrcOffsets uses it as startSrcOffset, and every node
   step point is rebased by adjustSrcOffset(ofs) = ofs - startSrcOffset + 1.  A
   nil methNode srcOffset is read as garbage and mangles every send/return line."
  methNode fileName: aName source: aString.
  aString ifNotNil: [
    methNode instVarAt: (GsComMethNode allInstVarNames indexOf: #srcOffset)
      put: 1.
    methNode instVarAt: (GsComMethNode allInstVarNames indexOf: #endSrcOffset)
      put: aString size ].
  ^ self
%

category: 'building'
method: PyIRBuilder
line: aLineNumber
  curLine := aLineNumber.
  ^ self
%

category: 'building'
method: PyIRBuilder
at: aSourceOffset
  "a 1-based Python character offset, stamped onto nodes built after it"
  curOffset := aSourceOffset.
  ^ self
%

category: 'private'
method: PyIRBuilder
stamp: aNode
  "record the current Python position on aNode: srcOffset when known, else line"
  curOffset
    ifNotNil: [ aNode sourceOffset: curOffset ]
    ifNil: [ aNode lineNumber isNil ifTrue: [ aNode lineNumber: curLine ] ].
  ^ aNode
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
  self stamp: aNode.
  blockStack last appendStatement: aNode.
  ^ aNode
%

category: 'nodes'
method: PyIRBuilder
int: anInteger
  ^ self stamp: (GsComLiteralNode newInteger: anInteger)
%

category: 'nodes'
method: PyIRBuilder
sym: aSymbol
  ^ self stamp: (GsComLiteralNode new leaf: (GsComLitLeaf new symbolLiteral: aSymbol))
%

category: 'nodes'
method: PyIRBuilder
obj: anObject
  ^ self stamp: (GsComLiteralNode newObject: anObject)
%

category: 'nodes'
method: PyIRBuilder
nilLit
  ^ self stamp: GsComLiteralNode newNil
%

category: 'nodes'
method: PyIRBuilder
trueLit
  ^ self stamp: GsComLiteralNode newTrue
%

category: 'nodes'
method: PyIRBuilder
var: aVarLeaf
  ^ self stamp: (GsComVariableNode new leaf: aVarLeaf)
%

category: 'nodes'
method: PyIRBuilder
selfVar
  ^ self stamp: GsComVariableNode newSelf
%

category: 'nodes'
method: PyIRBuilder
global: aSymbol
  "reference a global via its association in the current symbol list"
  | assoc |
  assoc := GsCurrentSession currentSession symbolList
    resolveSymbol: aSymbol.
  assoc isNil ifTrue: [ Error signal: 'unknown global ' , aSymbol ].
  ^ self stamp: (GsComVariableNode new leaf: (GsComVarLeaf new literalVariable: assoc))
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
  ^ self stamp: s
%

category: 'nodes'
method: PyIRBuilder
assign: aVarLeaf from: aNode
  ^ self stamp: (GsComAssignmentNode new dest: aVarLeaf source: aNode)
%

category: 'nodes'
method: PyIRBuilder
return: aNode
  ^ self stamp: (GsComReturnNode new return: aNode)
%

category: 'control'
method: PyIRBuilder
inBlockDo: aZeroArgBlock
  "open a GsComBlockNode context, run the builder block, close; answer the node"
  | blk |
  lexLevel := lexLevel + 1.
  blk := GsComBlockNode new lexLevel: lexLevel.
  self stamp: blk.
  blockStack addLast: blk.
  aZeroArgBlock value.
  blockStack removeLast.
  curOffset ifNil: [ blk lastLineNumber: curLine ].
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
  ^ self add: brk
%

category: 'control'
method: PyIRBuilder
continue
  | cont |
  loopStack isEmpty ifTrue: [ Error signal: 'continue outside a loop' ].
  cont := GsComGotoNode new.
  cont localRubyNext: loopStack last value argForValue: false.
  ^ self add: cont
%

category: 'generation'
method: PyIRBuilder
ensureEnvDict
  "the persistent method dict for `env` must exist before at:put:.
   persistentMethodDictForEnv:put: is a protected primitive, so create the
   dict the supported way -- compile a stub into `env` (06_env1.tpz)."
  (targetClass persistentMethodDictForEnv: env) ifNil: [
    env = 0
      ifTrue: [ targetClass compileMethod: '___irStub___ ^ nil'
                  dictionaries: GsCurrentSession currentSession symbolList
                  category: #irstub ]
      ifFalse: [ targetClass compileMethod: '___irStub___ ^ nil'
                  dictionaries: GsCurrentSession currentSession symbolList
                  category: #irstub
                  intoMethodDict: nil intoCategories: nil environmentId: env ] ].
  ^ targetClass persistentMethodDictForEnv: env
%

category: 'generation'
method: PyIRBuilder
install
  "generate and install in the target class in `env`; answer the GsNMethod"
  | meth |
  meth := GsNMethod generateFromIR: methNode.
  (meth isKindOf: GsNMethod) ifFalse: [
    Error signal: 'generateFromIR failed: ' , meth printString ].
  self ensureEnvDict at: methNode selector put: meth.
  Behavior _clearLookupCaches: env.
  env = 0 ifFalse: [ Behavior _clearLookupCaches: 0 ].
  ^ meth
%
