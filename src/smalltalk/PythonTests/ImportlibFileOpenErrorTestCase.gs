! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ImportlibFileOpenErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ImportlibFileOpenErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ImportlibFileOpenErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ImportlibFileOpenErrorTestCase - a failed file open reports the file (#900).
!
! GsFile>>open:mode:onClient: answers nil rather than raising, so an unchecked
! send turned a missing file into ``a UndefinedObject does not understand
! #contentsAsUtf8'' one line later -- naming neither the file nor the problem.
! The assertions therefore pin BOTH that an Error is raised AND that it is not
! a MessageNotUnderstood, since the old behaviour also ``raised''.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ImportlibFileOpenErrorTestCase removeAllMethods: 0.
ImportlibFileOpenErrorTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Private'
method: ImportlibFileOpenErrorTestCase
___missingPath___
	^ '/grail-no-such-directory/grail_missing_fixture.py'
%

category: 'Grail-Private'
method: ImportlibFileOpenErrorTestCase
___raiseFrom___: aBlock
	"Run aBlock and answer the exception it raised, or nil if it completed."

	^ [aBlock value. nil] on: Error do: [:ex |
		(ex isKindOf: AlmostOutOfStackError) ifTrue: [ex pass].
		ex return: ex]
%

category: 'Grail-Tests-FileOpenErrors'
method: ImportlibFileOpenErrorTestCase
test_ast_for_path_names_the_missing_file
	| ex |
	ex := self ___raiseFrom___: [importlib astForPath: self ___missingPath___].
	self assert: ex notNil description: 'a missing file did not raise at all'.
	self deny: (ex isKindOf: MessageNotUnderstood)
		description: 'still the old nil-propagation DNU: ' , ex messageText printString.
	self assert: (ex messageText indexOfSubCollection: 'grail_missing_fixture.py') > 0
		description: 'the error did not name the file: ' , ex messageText printString.
%

category: 'Grail-Tests-FileOpenErrors'
method: ImportlibFileOpenErrorTestCase
test_source_string_for_path_names_the_missing_file
	"The read half loadModuleFromPath: uses to hash a source before parsing it."

	| ex |
	ex := self ___raiseFrom___: [
		importlib ___sourceStringForPath___: self ___missingPath___].
	self assert: ex notNil description: 'a missing file did not raise at all'.
	self deny: (ex isKindOf: MessageNotUnderstood)
		description: 'still the old nil-propagation DNU: ' , ex messageText printString.
	self assert: (ex messageText indexOfSubCollection: 'grail_missing_fixture.py') > 0
		description: 'the error did not name the file: ' , ex messageText printString.
%

category: 'Grail-Tests-FileOpenErrors'
method: ImportlibFileOpenErrorTestCase
test_the_error_carries_the_open_mode_and_a_reason
	"Enough to act on: which file, opened how, and why it failed."

	| ex txt |
	ex := self ___raiseFrom___: [
		importlib ___openServerFile___: self ___missingPath___ mode: 'rb'].
	self assert: ex notNil.
	txt := ex messageText.
	self assert: (txt indexOfSubCollection: 'rb') > 0
		description: 'the error did not name the mode: ' , txt printString.
	self assert: (txt indexOfSubCollection: 'GsFile open failed') > 0
		description: 'unexpected message: ' , txt printString.
	self assert: txt size > 40
		description: 'the error carried no reason: ' , txt printString.
%

category: 'Grail-Tests-FileOpenErrors'
method: ImportlibFileOpenErrorTestCase
test_a_successful_open_still_works
	"Positive control: the check must not have broken the success path, and
	without this the three tests above would pass against a helper that simply
	always raised."

	| file src |
	file := importlib ___openServerFile___:
		importlib grailDir , '/tests/python/ir_codegen_smoke.py' mode: 'rb'.
	self assert: file notNil.
	src := file contentsAsUtf8 decodeToUnicode.
	file close.
	self assert: (src indexOfSubCollection: 'def answer') > 0
		description: 'the fixture read back wrong'.
%

category: 'Grail-Tests-FileOpenErrors'
method: ImportlibFileOpenErrorTestCase
test_importing_a_missing_module_path_names_the_file
	"The path a user actually hits: loadModuleFromPath: on something that is
	not there."

	| ex |
	ex := self ___raiseFrom___: [
		importlib loadModuleFromPath: self ___missingPath___ name: 'grail_missing_fixture'].
	self assert: ex notNil description: 'a missing module path did not raise'.
	self deny: (ex isKindOf: MessageNotUnderstood)
		description: 'still the old nil-propagation DNU: ' , ex messageText printString.
%
