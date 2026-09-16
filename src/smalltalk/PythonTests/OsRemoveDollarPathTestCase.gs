! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'OsRemoveDollarPathTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
OsRemoveDollarPathTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! OsRemoveDollarPathTestCase - a destructive os call must act on the path it was
! given, or on nothing.
!
! Issue #861: GemStone's server-file primitives expand ``$'', so os.remove('a$b')
! checked, deleted and reported success for ``a''.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
OsRemoveDollarPathTestCase removeAllMethods.
OsRemoveDollarPathTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - os'
method: OsRemoveDollarPathTestCase
tearDown

	importlib @env1:modules removeKey: #'os_remove_dollar_path' ifAbsent: [].
	self ___forgetCanonicalModule___: 'os_remove_dollar_path'.
%

category: 'Grail-Tests - os'
method: OsRemoveDollarPathTestCase
testADestructiveCallActsOnThePathItWasGiven
	"os.remove('a$b') used to delete ``a'' and return normally: the existence
	check, the removal, and the success report all went through a primitive that
	expands ``$''.  So the caller was told their file was gone while it was still
	there, and an unrelated one had been destroyed.

	Every check plants a DECOY at the expanded path, because without one the bug
	is invisible -- with nothing at ``a'', the primitive fails, the OSError sends
	the caller down a working fallback, and the whole thing looks like an
	ordinary missing-file error.  That is why it survived a full suite run.

	The fixture's invariants are written to hold under CPython too (it is
	self-running, so the fixture gate measures them there on every PR): CPython
	removes ``a$b'' and leaves the decoy, Grail declines and leaves both, and
	what neither may do is return normally having removed nothing, or touch the
	decoy.

	The three CONTROLS are what keep the guard narrow.  ``~'' and ``*'' are not
	metacharacters to these primitives -- measured -- so files named ``a~b'' and
	``a*b'' must still be removable.  A guard that refused anything
	punctuation-looking would satisfy every safety check above and fail those."

	| mod |
	importlib @env1:modules removeKey: #'os_remove_dollar_path' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/os_remove_dollar_path.py')
		name: 'os_remove_dollar_path'.
	#( 'removing_a_dollar_path_never_destroys_the_expansion_target'
	   'removing_a_dollar_path_either_removes_it_or_raises'
	   'renaming_onto_a_dollar_path_never_destroys_the_expansion_target'
	   'removing_a_dollar_directory_never_destroys_the_expansion_target'
	   "Controls."
	   'an_ordinary_path_is_still_removed'
	   'a_tilde_path_is_still_removed'
	   'a_starred_path_is_still_removed' ) do: [:k |
		| answer |
		answer := (mod @env1:RESULTS) @env1:__getitem__: k.
		self assert: (answer = true)
			description: 'dollar-path check failed: ' , k , ' -> ' , answer printString]
%

category: 'Grail-Tests - os'
method: OsRemoveDollarPathTestCase
testTheGuardNamesBothPathsInTheError
	"The error has to say what it would have done, because the caller cannot see
	it any other way: os.path.exists reads through the same expanding primitive
	and agrees with the wrong answer.  Naming the expansion is what turns this
	from a refusal into a diagnosis.

	Asked of the message text rather than of behaviour: the behaviour is covered
	above, and what is pinned here is that the diagnosis does not quietly
	degrade into a bare ``Cannot remove file''."

	| msg |
	msg := nil.
	[(Python at: #os) ___instance___ @env1:remove: '/tmp/grail_no_such_dir_861/a$b']
		on: AbstractException
		do: [:ex | msg := ex messageText. ex return: nil].
	self deny: msg isNil description: 'the guard must raise'.
	self assert: (msg includesString: 'a$b')
		description: 'the message must name the path asked for: ' , msg printString.
	"NOT satisfied by the pre-fix message.  The old code reached this path too --
	the file does not exist, so it raised FileNotFoundError -- and that message
	quotes the path as well, so asserting only on the path passes against the
	very code this is here to reject.  Measured: it did.  The word the fix adds
	is the EXPANSION, which is the part the caller cannot otherwise see."
	self assert: (msg includesString: 'expand')
		description: 'the message must say the path was expanded: ' , msg printString.
	self assert: (msg includesString: 'would act on')
		description: 'the message must name what it would have hit: ' , msg printString
%
