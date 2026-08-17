! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for OsPathPredicateTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'OsPathPredicateTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
OsPathPredicateTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! OsPathPredicateTestCase
!
! os.listdir and the os.path predicates -- exists / isdir / isfile / islink --
! on the filenames and file types they used to answer WRONGLY.  Both defects
! were silent, and the first was of the worst kind: a confident answer about a
! different file.
!
! THE FILENAME DEFECT.  GsFile expands ``$'' in every path handed to its file
! primitives, so ``exists('dir/a$b')'' asked about ``dir/a''.  That is not a
! near-miss:
!
!     dir/a      contains 'decoy!'     -- 6 bytes
!     dir/a$b    is empty              -- 0 bytes
!
! and exists answered TRUE, stat answered SIX, and open() read 'decoy!'.  Every
! predicate built on existsOnServer: inherited it.  A name containing a ``$''
! was also missing from os.listdir altogether, because the public directory
! listing expands its argument as a shell PATTERN.
!
! The fix is one substitution repeated: every predicate now rests on
! GsFile>>stat:isLstat:, which is the only file primitive that does NOT expand,
! and os.listdir goes to the directory PRIMITIVE rather than its public wrapper.
! The primitive also answers the real ERRNO -- which is how PermissionError
! became reportable at all; the wrapper could not tell EACCES from an empty
! directory.
!
! THE FILE-TYPE DEFECT was quieter.  isfile asked ``is it not a directory'', so
! a fifo, a socket or a device answered TRUE where CPython says False.  isfile
! means REGULAR file, and the predicates now read the file-type field of st_mode
! rather than a directory yes/no -- which is also what let isdir stop depending
! on GsFile>>isServerDirectory:, whose answer for a missing path is NIL rather
! than false.
!
! WHAT IS STILL NOT FIXED, and cannot be from here: CREATING or REMOVING a
! ``$'' path.  Those primitives expand and have no non-expanding variant, so
! ``open('dir/a$b','w')'' still writes to ``dir/a''.  The fixture therefore
! makes its two ``$'' files through the shell and pins the READING side.  This
! is a GemStone-level limitation, reported upstream.
!
! Drives tests/python/os_path_predicates.py, whose EXPECTED table was generated
! by RUNNING CPython 3.14.6 and verified against it before commit.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
OsPathPredicateTestCase removeAllMethods.
OsPathPredicateTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: OsPathPredicateTestCase
setUp
	"Reload tests/python/os_path_predicates.py fresh each test.  The module
	body builds its tree, records every answer, and removes the tree again."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'os_path_predicates' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/os_path_predicates.py')
		name: 'os_path_predicates'.
%

category: 'Grail-Private'
method: OsPathPredicateTestCase
assertMatchesCPythonAt: key
	"Compare through repr -- the file SIZES below are the assertions that say
	which file was reached, and asString would let 0 and '0' pass for each
	other."

	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.
%

category: 'Grail-Tests - Dollar In A Filename'
method: OsPathPredicateTestCase
testAFileWhoseNameHoldsADollarIsListed
	"It was absent from os.listdir entirely: the public directory listing
	expands its argument as a shell pattern, and ``a$b'' expanded to ``a''."

	self assertMatchesCPythonAt: 'listdir_includes_dollar_names'.
%

category: 'Grail-Tests - Dollar In A Filename'
method: OsPathPredicateTestCase
testThePredicatesAnswerAboutTheFileThatWasNamed
	"THE ASSERTION THAT MATTERS IS THE SIZE, not the boolean.  ``a$b'' is
	empty and the decoy ``a'' beside it holds six bytes, so 0 means the right
	file was reached and 6 means the expanded path won.  exists answering
	True proves nothing on its own -- it answered True before, about ``a''."

	self assertMatchesCPythonAt: 'dollar_stat_reaches_the_right_file'.
	self assertMatchesCPythonAt: 'decoy_is_a_different_file'.
	self assertMatchesCPythonAt: 'dollar_exists'.
	self assertMatchesCPythonAt: 'dollar_isfile'.
	self assertMatchesCPythonAt: 'dollar_isdir'.
	self assertMatchesCPythonAt: 'dollar_islink'.
%

category: 'Grail-Tests - Dollar In A Filename'
method: OsPathPredicateTestCase
testAVariableLikeNameIsNotSplitAtTheDollar
	"``has$HOMEin'' is ONE undefined variable to a shell, not ``$HOME''
	followed by ``in'', so an expanding path lost the whole tail rather than
	substituting a home directory.  Worth its own case: a fix that merely
	special-cased known variable names would still fail it."

	self assertMatchesCPythonAt: 'dollar_home_like_name'.
%

category: 'Grail-Tests - Dollar In A Filename'
method: OsPathPredicateTestCase
testTheOtherShellCharactersStayLiteral
	"``*'' and ``~'' were never expanded, and must not start being.  A fix
	that reached for a shell to solve the ``$'' problem would be the same bug
	wearing a new hat, and these are what would catch it."

	self assertMatchesCPythonAt: 'star_is_literal'.
	self assertMatchesCPythonAt: 'tilde_is_literal'.
	self assertMatchesCPythonAt: 'star_is_not_a_glob'.
%

category: 'Grail-Tests - File Types'
method: OsPathPredicateTestCase
testIsFileMeansRegularFile
	"A fifo is not a regular file, and isfile used to ask ``is it not a
	directory'' -- so it answered True for a fifo, a socket and a device
	alike.  A fifo is the easiest of the three to create portably; the rule
	it pins covers all of them."

	self assertMatchesCPythonAt: 'fifo_exists'.
	self assertMatchesCPythonAt: 'fifo_is_not_a_file'.
	self assertMatchesCPythonAt: 'fifo_is_not_a_dir'.
	self assertMatchesCPythonAt: 'fifo_is_not_a_link'.
	self assertMatchesCPythonAt: 'fifo_is_listed'.
%

category: 'Grail-Tests - File Types'
method: OsPathPredicateTestCase
testANonRegularFileCanStillBeRemoved
	"Reclassifying a fifo must not make it unremovable -- that would trade a
	wrong answer for a leak."

	self assertMatchesCPythonAt: 'fifo_can_be_removed'.
	self assertMatchesCPythonAt: 'fifo_is_gone'.
%

category: 'Grail-Tests - File Types'
method: OsPathPredicateTestCase
testDirectoriesAndFilesStayDistinct
	"The ordinary cases, which the rewrite had to keep -- isdir no longer
	consults GsFile>>isServerDirectory:, whose answer for a MISSING path is
	nil rather than false, and which therefore could not be used as a Boolean
	without a preceding existence check that had the expansion flaw."

	self assertMatchesCPythonAt: 'dir_is_a_dir'.
	self assertMatchesCPythonAt: 'dir_is_not_a_file'.
	self assertMatchesCPythonAt: 'file_is_not_a_dir'.
%

category: 'Grail-Tests - Symlinks'
method: OsPathPredicateTestCase
testThePredicatesFollowLinksExceptIsLink
	self assertMatchesCPythonAt: 'link_exists'.
	self assertMatchesCPythonAt: 'link_is_a_dir'.
	self assertMatchesCPythonAt: 'link_is_a_link'.
%

category: 'Grail-Tests - Symlinks'
method: OsPathPredicateTestCase
testADanglingLinkIsALinkButDoesNotExist
	"The case that decides lstat versus stat.  islink must LSTAT -- following
	would find nothing and answer false -- while exists must NOT, because
	CPython's exists follows and there is nothing at the far end.  A single
	shared probe would get one of the two backwards."

	self assertMatchesCPythonAt: 'broken_link_is_a_link'.
	self assertMatchesCPythonAt: 'broken_link_does_not_exist'.
	self assertMatchesCPythonAt: 'broken_link_is_not_a_file'.
	self assertMatchesCPythonAt: 'broken_link_is_listed'.
%

category: 'Grail-Tests - Missing Paths'
method: OsPathPredicateTestCase
testAPredicateNeverRaisesButStatDoes
	"The predicates answer a Boolean for anything, including a path that
	cannot be stat'd at all; os.stat on the same path raises.  That split is
	why there are two stat helpers -- a nil-answering one for the predicates
	and a signalling one for os.stat -- rather than one with a flag."

	self assertMatchesCPythonAt: 'missing_exists'.
	self assertMatchesCPythonAt: 'missing_isfile'.
	self assertMatchesCPythonAt: 'missing_isdir'.
	self assertMatchesCPythonAt: 'missing_islink'.
	self assertMatchesCPythonAt: 'missing_stat_raises'.
%
