! PyMethodIRBuilder: a thin layer over GemStone's GsCompilerIRNode builder API,
! used by the direct-to-IR codegen path (GRAIL_IR_CODEGEN).  It is the production
! sibling of experiments/ir/PyIRBuilder.gs: same shape, but it resolves the
! GsCom* node classes through the GsCompilerClasses dictionary (they are NOT on
! the runtime symbol list) and it talks to importlib for the compile symbol list.
!
! An AST walker drives it: `class:selector:env:` opens a method, `argNamed:` /
! `tempNamed:` declare parameters and locals, `fileName:source:` attaches the
! Python text, `at:` sets the current 1-based Python character offset that is
! stamped onto every node built after it, node constructors build expression /
! statement nodes, `add:` appends a statement, and `install` generates the
! GsNMethod (primitive 679) and stores it in the target class's env-1 method
! dictionary.
!
! Only the subset the first IR cut needs is wired here (literals, locals,
! returns); it grows as FunctionDefAst>>___irEligible___ widens.

! ------------------- Class definition for PyMethodIRBuilder
expectvalue /Class
doit
Object subclass: 'PyMethodIRBuilder'
	instVarNames: #(methNode targetClass env curOffset locals)
	classVars: #()
	classInstVars: #()
	poolDictionaries: #()
	inDictionary: PythonAst
	options: #()
%

! ------------------- Remove existing behavior from PyMethodIRBuilder
removeallmethods PyMethodIRBuilder
removeallclassmethods PyMethodIRBuilder

set compile_env: 0

category: 'private'
classmethod: PyMethodIRBuilder
node: aSymbol
	"Resolve a GsCom* node class by name -- they live in the GsCompilerClasses
	dictionary (in Globals) but are NOT on the runtime symbol list, so a bare
	reference would not compile."

	^ GsCompilerClasses at: aSymbol
%

category: 'instance creation'
classmethod: PyMethodIRBuilder
class: aClass selector: aSelector env: anEnvId
	^ self new initClass: aClass selector: aSelector env: anEnvId
%

category: 'initialization'
method: PyMethodIRBuilder
initClass: aClass selector: aSelector env: anEnvId
	| mnClass |
	mnClass := PyMethodIRBuilder node: #GsComMethNode.
	methNode := mnClass newSmalltalk.
	methNode instVarAt: (mnClass allInstVarNames indexOf: #selector)
		put: aSelector.
	methNode class: aClass.
	"envInfo = bodyEnv | (selectorEnv << 8); both are anEnvId (comparse.ht)."
	methNode instVarAt: (mnClass allInstVarNames indexOf: #envInfo)
		put: (anEnvId bitOr: (anEnvId bitShift: 8)).
	methNode fileName: 'PyMethodIRBuilder' source: nil.
	targetClass := aClass.
	env := anEnvId.
	curOffset := nil.
	locals := IdentityKeyValueDictionary new.
	^ self
%

category: 'building'
method: PyMethodIRBuilder
fileName: aName source: aString
	"Attach the Python source text; node srcOffsets index into it.  The method's
	own source begins at offset 1 of this string, so the methNode's srcOffset MUST
	be 1: codegen's initSrcOffsets reads it as startSrcOffset and rebases every
	step point by adjustSrcOffset(ofs) = ofs - startSrcOffset + 1.  A nil methNode
	srcOffset is read as garbage and mangles every send/return line."

	| mnClass |
	mnClass := PyMethodIRBuilder node: #GsComMethNode.
	methNode fileName: aName source: aString.
	aString ifNotNil: [
		methNode instVarAt: (mnClass allInstVarNames indexOf: #srcOffset) put: 1.
		methNode instVarAt: (mnClass allInstVarNames indexOf: #endSrcOffset)
			put: aString size].
	^ self
%

category: 'building'
method: PyMethodIRBuilder
at: aSourceOffset
	"A 1-based Python character offset, stamped onto nodes built after it."

	curOffset := aSourceOffset.
	^ self
%

category: 'private'
method: PyMethodIRBuilder
stamp: aNode
	"Record the current Python position on aNode when a source offset is set."

	curOffset ifNotNil: [aNode sourceOffset: curOffset].
	^ aNode
%

category: 'building'
method: PyMethodIRBuilder
argNamed: aSymbol
	| leaf |
	leaf := (PyMethodIRBuilder node: #GsComVarLeaf) new
		methodArg: aSymbol
		argNumber: methNode arguments size + 1.
	methNode appendArg: leaf.
	locals at: aSymbol put: leaf.
	^ leaf
%

category: 'building'
method: PyMethodIRBuilder
tempNamed: aSymbol
	| leaf |
	leaf := (PyMethodIRBuilder node: #GsComVarLeaf) new methodTemp: aSymbol.
	methNode appendTemp: leaf.
	locals at: aSymbol put: leaf.
	^ leaf
%

category: 'building'
method: PyMethodIRBuilder
leafFor: aSymbol
	"The VarLeaf for a registered parameter or local, or nil."

	^ locals at: aSymbol otherwise: nil
%

category: 'nodes'
method: PyMethodIRBuilder
localVar: aSymbol
	"A variable node reading a registered parameter/local by Python name."

	| leaf |
	leaf := self leafFor: aSymbol.
	leaf isNil ifTrue: [
		Error signal: 'PyMethodIRBuilder: no local named ' , aSymbol printString].
	^ self var: leaf
%

category: 'building'
method: PyMethodIRBuilder
add: aNode
	"Append aNode as a statement in the method body."

	self stamp: aNode.
	methNode appendStatement: aNode.
	^ aNode
%

category: 'nodes'
method: PyMethodIRBuilder
obj: anObject
	"A literal reference to any Smalltalk object (Integer, Float, String,
	ByteArray, ...)."

	^ self stamp: ((PyMethodIRBuilder node: #GsComLiteralNode) newObject: anObject)
%

category: 'nodes'
method: PyMethodIRBuilder
trueLit
	^ self stamp: (PyMethodIRBuilder node: #GsComLiteralNode) newTrue
%

category: 'nodes'
method: PyMethodIRBuilder
falseLit
	^ self stamp: (PyMethodIRBuilder node: #GsComLiteralNode) newFalse
%

category: 'nodes'
method: PyMethodIRBuilder
var: aVarLeaf
	^ self stamp: ((PyMethodIRBuilder node: #GsComVariableNode) new leaf: aVarLeaf)
%

category: 'nodes'
method: PyMethodIRBuilder
globalNamed: aSymbol
	"Reference a Python-dictionary global (e.g. #None, #Ellipsis) via its
	association on the Grail compile symbol list."

	| assoc |
	assoc := importlib ___grailCompileSymbolList___ resolveSymbol: aSymbol.
	assoc isNil ifTrue: [
		Error signal: 'PyMethodIRBuilder: unknown global ' , aSymbol printString].
	^ self stamp: ((PyMethodIRBuilder node: #GsComVariableNode) new
		leaf: ((PyMethodIRBuilder node: #GsComVarLeaf) new literalVariable: assoc))
%

category: 'nodes'
method: PyMethodIRBuilder
send: aSelector to: rcvrNode with: argNodes
	"A non-optimized send; selLeaf is a bare Symbol (the builder's stSelector:
	is bit-rotted -- see experiments/ir/README)."

	| s sClass |
	sClass := PyMethodIRBuilder node: #GsComSendNode.
	s := sClass new.
	s rcvr: rcvrNode.
	s instVarAt: (sClass allInstVarNames indexOf: #selLeaf) put: aSelector.
	s instVarAt: (sClass allInstVarNames indexOf: #envFlags) put: 0.
	argNodes do: [:a | s appendArgument: a].
	^ self stamp: s
%

category: 'nodes'
method: PyMethodIRBuilder
return: aNode
	^ self stamp: ((PyMethodIRBuilder node: #GsComReturnNode) new return: aNode)
%

category: 'nodes'
method: PyMethodIRBuilder
returnNone
	"Python ``return'' with no value / a fall-off-the-end return: ^ None."

	^ self return: (self globalNamed: #None)
%

category: 'generation'
method: PyMethodIRBuilder
ensureEnvDict
	"The persistent method dict for `env` must exist before at:put:.
	persistentMethodDictForEnv:put: is a protected primitive; the pre-pass in
	___buildModuleClassBody:name: has already compiled an arity stub into env 1,
	so the dict exists.  Guard anyway for standalone callers."

	(targetClass persistentMethodDictForEnv: env) ifNil: [
		targetClass
			compileMethod: '___irStub___ ^ nil'
			dictionaries: importlib ___grailCompileSymbolList___
			category: #irstub
			intoMethodDict: nil
			intoCategories: nil
			environmentId: env].
	^ targetClass persistentMethodDictForEnv: env
%

category: 'generation'
method: PyMethodIRBuilder
install
	"Generate the method (primitive 679) and install it in the target class's
	env-`env` method dictionary, replacing the arity stub.  Answer the GsNMethod."

	| meth |
	meth := GsNMethod generateFromIR: methNode.
	(meth isKindOf: GsNMethod) ifFalse: [
		Error signal: 'PyMethodIRBuilder generateFromIR failed: ' , meth printString].
	self ensureEnvDict at: methNode selector put: meth.
	Behavior _clearLookupCaches: env.
	env = 0 ifFalse: [Behavior _clearLookupCaches: 0].
	^ meth
%
