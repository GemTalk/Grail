! ===============================================================================
! Grail Installation Script
! ===============================================================================
! This script installs the Grail Python implementation in GemStone Smalltalk.
! It performs the following steps:
! 1. Removes existing SymbolDictionaries (Python, PythonAst, PythonTests)
!    and creates fresh ones in the correct order
! 2. Loads Python built-in type classes (handles user switching internally)
! 3. Loads AST node classes
! 4. Loads test classes
! 5. Verifies installation
!
! PERMISSIONS:
! - This script should be started as DataCurator
! - The _PythonClasses.gs file handles switching to SystemUser when needed
! ===============================================================================

! ------------------- Step 1: Remove and recreate SymbolDictionaries
run
| userProfile symbolList names pythonDict pythonASTDict pythonTestsDict |
userProfile := System myUserProfile.
symbolList := userProfile symbolList.
names := symbolList names.

"Remove PythonTests dictionary if it exists"
(names includes: #'PythonTests') ifTrue: [
	symbolList removeAtIndex: (names indexOf: #'PythonTests').
	Transcript show: 'Removed PythonTests dictionary'.
] ifFalse: [
	Transcript show: 'PythonTests dictionary not found (OK)'.
].
%
run
| userProfile symbolList names pythonDict pythonASTDict pythonTestsDict |
userProfile := System myUserProfile.
symbolList := userProfile symbolList.
names := symbolList names.

"Remove Python dictionary if it exists"
(names includes: #'Python') ifTrue: [
	symbolList removeAtIndex: (names indexOf: #'Python').
	Transcript show: 'Removed Python dictionary'.
] ifFalse: [
	Transcript show: 'Python dictionary not found (OK)'.
].
%
run
| userProfile symbolList names pythonDict pythonASTDict pythonTestsDict |
userProfile := System myUserProfile.
symbolList := userProfile symbolList.
names := symbolList names.

"Remove PythonAst dictionary if it exists"
(names includes: #'PythonAst') ifTrue: [
	symbolList removeAtIndex: (names indexOf: #'PythonAst').
	Transcript show: 'Removed PythonAst dictionary'.
] ifFalse: [
	Transcript show: 'PythonAst dictionary not found (OK)'.
].
%
run
| userProfile symbolList names pythonDict pythonASTDict pythonTestsDict |
userProfile := System myUserProfile.
symbolList := userProfile symbolList.
names := symbolList names.

"Create Python dictionary (first in order)"
pythonDict := SymbolDictionary new name: #'Python'; yourself.
userProfile insertDictionary: pythonDict at: 1.
Transcript show: 'Created Python dictionary'.

"Create PythonAst dictionary (second in order)"
pythonASTDict := SymbolDictionary new name: #'PythonAst'; yourself.
userProfile insertDictionary: pythonASTDict at: 2.
Transcript show: 'Created PythonAst dictionary'.

"Create PythonTests dictionary (third in order)"
pythonTestsDict := SymbolDictionary new name: #'PythonTests'; yourself.
userProfile insertDictionary: pythonTestsDict at: 3.
Transcript show: 'Created PythonTests dictionary'.

"Forward declarations to avoid circular reference between importlib and AST classes"
pythonASTDict 
	at: #'ModuleAst' put: nil;
	at: #'PrettyWriteStream' put: nil;
	yourself.
Transcript show: 'Forward declared ModuleAst and PrettyWriteStream (will be defined later)'.

Transcript show: 'Step 1 complete: Recreated dictionaries in correct order'.
%

! ------------------- Step 2: Load Python built-in type classes
! NOTE: The _PythonClasses.gs file handles user switching internally:
!       - Maps types as DataCurator
!       - Switches to SystemUser to add methods to base classes
!       - Switches back to DataCurator for new Python classes
run
Transcript show: 'Step 2: Loading Python built-in type classes...'.
%
input smalltalk/classes/_PythonClasses.gs
run
Transcript show: 'Step 2 complete: Python built-in type classes loaded'.
%
! ------------------- Step 3: Load AST classes
run
Transcript show: 'Step 3: Loading AST classes...'.
%
input smalltalk/ast/_PythonAst.gs
run
Transcript show: 'Step 3 complete: AST classes loaded'.
%
! ------------------- Step 4: Load test classes
run
Transcript show: 'Step 4: Loading test classes...'.
%
input smalltalk/tests/_PythonTests.gs
run
Transcript show: 'Step 4 complete: Test classes loaded'.
%

! ------------------- Step 5: Verify installation
run
| userProfile symbolList names pythonDict pythonASTDict pythonTestsDict |
userProfile := System myUserProfile.
symbolList := userProfile symbolList.
names := symbolList names.

Transcript cr; show: '==============================================='.
Transcript show: 'Installation Verification'.
Transcript show: '==============================================='.

"Check Python dictionary (loaded first)"
(names includes: #'Python') ifTrue: [
	pythonDict := symbolList objectNamed: #'Python'.
	Transcript show: 'Python dictionary: OK (', pythonDict size printString, ' types)'.
	Transcript show: '  - object -> ', (pythonDict at: #'object' ifAbsent: ['MISSING']) printString.
] ifFalse: [
	Transcript show: 'Python dictionary: MISSING!'.
].

"Check PythonAst dictionary (loaded second, can reference Python types)"
(names includes: #'PythonAst') ifTrue: [
	pythonASTDict := symbolList objectNamed: #'PythonAst'.
	Transcript show: 'PythonAst dictionary: OK (', pythonASTDict size printString, ' classes)'.
] ifFalse: [
	Transcript show: 'PythonAst dictionary: MISSING!'.
].

"Check PythonTests dictionary (loaded last, can reference both Python and PythonAst)"
(names includes: #'PythonTests') ifTrue: [
	pythonTestsDict := symbolList objectNamed: #'PythonTests'.
	Transcript show: 'PythonTests dictionary: OK (', pythonTestsDict size printString, ' test classes)'.
] ifFalse: [
	Transcript show: 'PythonTests dictionary: MISSING!'.
].

Transcript show: '==============================================='.
Transcript show: 'Installation complete!'.
Transcript show: 'To run tests:'.
Transcript show: '  ObjectTestCase run'.
Transcript show: '  BooleanTestCase run'.
Transcript show: '  IntegerTestCase run'.
Transcript show: '  FloatTestCase run'.
Transcript show: '  ComplexTestCase run'.
Transcript show: '  StrTestCase run'.
Transcript show: '  ListTestCase run'.
Transcript show: '  TupleTestCase run'.
Transcript show: '  BaseExceptionTestCase run'.
Transcript show: ''.
Transcript show: 'To run all exception tests (67 test classes):'.
Transcript show: '  | suite |'.
Transcript show: '  suite := TestSuite named: ''Exception Tests''.'.
Transcript show: '  #(BaseExceptionTestCase ArithmeticErrorTestCase'.
Transcript show: '    AssertionErrorTestCase AttributeErrorTestCase'.
Transcript show: '    ... and 63 more) do: [:each |'.
Transcript show: '      suite addTest: (each suite)].'.
Transcript show: '  suite run'.
Transcript show: ''.
Transcript show: 'Or run individual exception tests like:'.
Transcript show: '  TypeErrorTestCase run'.
Transcript show: '  ValueErrorTestCase run'.
Transcript show: '  FileNotFoundErrorTestCase run'.
Transcript show: '==============================================='.
%

