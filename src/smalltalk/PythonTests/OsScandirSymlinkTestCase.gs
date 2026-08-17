! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for OsScandirSymlinkTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'OsScandirSymlinkTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
OsScandirSymlinkTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! OsScandirSymlinkTestCase
!
! os.scandir / DirEntry, and os.symlink / os.readlink -- the two gaps that
! showed up while adding os.walk.  Neither was WRONG; both were simply absent,
! so what is asserted here is CPython's contract rather than a correction.
!
! WHAT IS EASY TO GET WRONG IN scandir IS THE SYMLINK DEFAULTS, and they are
! deliberately not uniform:
!
!   * is_dir() and is_file() FOLLOW symlinks by default, so a symlink to a
!     directory answers true to is_dir();
!   * is_dir(follow_symlinks=False) answers FALSE for that same entry, because
!     with following off a symlink is only ever a symlink;
!   * is_symlink() takes no such argument at all -- asking whether something IS
!     a link cannot follow it -- and neither does inode();
!   * and follow_symlinks is KEYWORD-ONLY, so is_dir(False) is a TypeError
!     rather than a quiet "don't follow".
!
! scandir answers an object that is BOTH an iterator and a context manager,
! because ``with os.scandir(p) as it:'' is the spelling CPython's own library
! uses.  A plain generator would satisfy every other test here and fail that
! one; it is the reason os_ScandirIterator is a class.
!
! FOR symlink THE POINT IS THAT src NEED NOT EXIST.  A dangling symlink is legal
! POSIX and legal CPython, and test code creates them deliberately.  Supporting
! that turned up a THIRD defect, in os.remove: it tested ``exists'', which
! FOLLOWS the link, so a dangling one looked absent and raised FileNotFoundError
! where CPython unlinks it.  Cleanup code that had created such a link could
! therefore not remove it -- which is how this fixture's own teardown found it.
!
! Grail has no symlink primitive (GsFile can TEST for a symbolic link but not
! make one), so os.symlink runs ``ln -s''.  That is why the fixture links a path
! containing a space, a single quote and a semicolon: shell quoting that is
! merely nearly right turns a filename into shell syntax, and the semicolon
! makes that arbitrary command execution rather than a wrong answer.
!
! Drives tests/python/os_scandir_symlink.py, whose EXPECTED table was generated
! by RUNNING CPython 3.14.6 and verified against it before commit.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
OsScandirSymlinkTestCase removeAllMethods.
OsScandirSymlinkTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: OsScandirSymlinkTestCase
setUp
	"Reload tests/python/os_scandir_symlink.py fresh each test.  The module
	body builds its tree, records every answer, and tears the tree down again,
	so the tests read recorded results rather than sharing filesystem state."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'os_scandir_symlink' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/os_scandir_symlink.py')
		name: 'os_scandir_symlink'.
%

category: 'Grail-Private'
method: OsScandirSymlinkTestCase
assertMatchesCPythonAt: key
	"Compare through repr: several answers here are booleans, and one is a
	TUPLE of two booleans, which asString would flatten into the same text."

	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.
%

category: 'Grail-Tests - scandir iterator'
method: OsScandirSymlinkTestCase
testScandirListsTheDirectory
	self assertMatchesCPythonAt: 'names'.
	self assertMatchesCPythonAt: 'path_is_joined'.
%

category: 'Grail-Tests - scandir iterator'
method: OsScandirSymlinkTestCase
testTheIteratorAndEntryReportCPythonsIdentity
	"Both types report ``posix'' as their module, not ``os'': they are
	implemented in the posix extension and only re-exported by os.  And
	os.DirEntry is a real module attribute, which code type-tests against
	even though nothing can construct one."

	self assertMatchesCPythonAt: 'scandir_type'.
	self assertMatchesCPythonAt: 'entry_type'.
	self assertMatchesCPythonAt: 'entry_module'.
	self assertMatchesCPythonAt: 'entry_repr'.
	self assertMatchesCPythonAt: 'is_a_DirEntry'.
%

category: 'Grail-Tests - scandir iterator'
method: OsScandirSymlinkTestCase
testScandirIsAlsoAContextManager
	"``with os.scandir(p) as it:'' is the spelling CPython's own library
	uses.  This is the one test a plain generator could not pass, and so the
	reason os_ScandirIterator is a class."

	self assertMatchesCPythonAt: 'context_manager'.
	self assertMatchesCPythonAt: 'closed_iterator_is_exhausted'.
	self assertMatchesCPythonAt: 'close_is_idempotent'.
%

category: 'Grail-Tests - DirEntry'
method: OsScandirSymlinkTestCase
testAnEntryAnswersItsOwnKind
	self assertMatchesCPythonAt: 'dir_is_dir'.
	self assertMatchesCPythonAt: 'dir_is_not_file'.
	self assertMatchesCPythonAt: 'file_is_file'.
	self assertMatchesCPythonAt: 'file_is_not_dir'.
	self assertMatchesCPythonAt: 'inode_is_positive'.
	self assertMatchesCPythonAt: 'is_junction_is_false_on_posix'.
%

category: 'Grail-Tests - DirEntry'
method: OsScandirSymlinkTestCase
testAnEntryIsPathLike
	"DirEntry implements __fspath__, so it can be handed straight to open()
	or any os function -- which is most of the point of scandir."

	self assertMatchesCPythonAt: 'entry_is_path_like'.
%

category: 'Grail-Tests - DirEntry symlink defaults'
method: OsScandirSymlinkTestCase
testIsDirFollowsSymlinksByDefaultAndNotWhenAsked
	"The asymmetry that is easy to get wrong: the SAME entry answers true and
	then false, purely on the default of follow_symlinks."

	self assertMatchesCPythonAt: 'link_is_dir_by_default'.
	self assertMatchesCPythonAt: 'link_is_not_dir_without_following'.
	self assertMatchesCPythonAt: 'link_is_a_symlink'.
	self assertMatchesCPythonAt: 'link_is_not_file_either_way'.
%

category: 'Grail-Tests - DirEntry symlink defaults'
method: OsScandirSymlinkTestCase
testStatFollowsAndLstatDoesNot
	"entry.stat() reports the TARGET's mode; entry.stat(follow_symlinks=False)
	reports the link's own.  Reading the wrong one is silent -- both answer a
	perfectly good stat_result."

	self assertMatchesCPythonAt: 'link_stat_reports_the_target'.
	self assertMatchesCPythonAt: 'link_lstat_reports_the_link'.
%

category: 'Grail-Tests - DirEntry symlink defaults'
method: OsScandirSymlinkTestCase
testFollowSymlinksIsKeywordOnly
	"``is_dir(False)'' is a TypeError, not ``don't follow''.  Accepting it
	positionally would read as the opposite of what CPython does for anyone
	who wrote it by mistake."

	self assertMatchesCPythonAt: 'positional_follow_symlinks_is_an_error'.
%

category: 'Grail-Tests - scandir errors'
method: OsScandirSymlinkTestCase
testScandirRaisesForAMissingPathAndForAFile
	"Inherited from listdir rather than restated, so the two stay in step."

	self assertMatchesCPythonAt: 'scandir_missing'.
	self assertMatchesCPythonAt: 'scandir_on_a_file'.
%

category: 'Grail-Tests - symlink'
method: OsScandirSymlinkTestCase
testASymlinkIsCreatedAndReadsBackVerbatim
	"readlink answers the target AS GIVEN -- a relative target stays
	relative, unresolved against the link's directory.  os.path.realpath is
	what resolves; readlink deliberately does not."

	self assertMatchesCPythonAt: 'symlink_returns_none'.
	self assertMatchesCPythonAt: 'relative_target_is_verbatim'.
	self assertMatchesCPythonAt: 'relative_link_resolves'.
	self assertMatchesCPythonAt: 'absolute_symlink'.
	self assertMatchesCPythonAt: 'absolute_target_is_verbatim'.
	self assertMatchesCPythonAt: 'absolute_link_resolves'.
%

category: 'Grail-Tests - symlink'
method: OsScandirSymlinkTestCase
testADanglingSymlinkIsLegal
	"src is NOT required to exist.  Supporting this turned up a defect in
	os.remove, which tested ``exists'' -- and exists FOLLOWS the link, so a
	dangling one looked absent and raised FileNotFoundError where CPython
	unlinks it.  Cleanup code that had just created such a link could
	therefore not remove it, which is how the fixture's own teardown found
	it."

	self assertMatchesCPythonAt: 'dangling_symlink'.
	self assertMatchesCPythonAt: 'dangling_is_a_link'.
	self assertMatchesCPythonAt: 'dangling_does_not_exist'.
	self assertMatchesCPythonAt: 'dangling_target_reads_back'.
%

category: 'Grail-Tests - symlink'
method: OsScandirSymlinkTestCase
testTargetIsDirectoryIsAcceptedAndIgnored
	"A Windows argument, where the two kinds of link differ.  CPython accepts
	and ignores it on POSIX, so rejecting it would break portable code for no
	gain."

	self assertMatchesCPythonAt: 'target_is_directory_is_accepted'.
	self assertMatchesCPythonAt: 'target_is_directory_link_works'.
%

category: 'Grail-Tests - symlink'
method: OsScandirSymlinkTestCase
testAShellHostileFilenameSurvives
	"os.symlink runs ``ln -s'', so the paths are shell-quoted.  The name here
	holds a space, a single quote and a SEMICOLON -- quoting that is merely
	nearly right would re-parse the last one as a command separator, which is
	arbitrary command execution rather than a wrong answer.  The final check
	is that the directory afterwards holds exactly what was created and
	nothing a re-parse produced."

	self assertMatchesCPythonAt: 'shell_hostile_name'.
	self assertMatchesCPythonAt: 'shell_hostile_name_is_a_link'.
	self assertMatchesCPythonAt: 'shell_hostile_name_reads_back'.
	self assertMatchesCPythonAt: 'nothing_extra_was_created'.
%

category: 'Grail-Tests - symlink errors'
method: OsScandirSymlinkTestCase
testCreatingOverAnExistingNameIsAnError
	"...including when the occupant is itself a DANGLING link.  A plain
	exists() check would follow it, find nothing, and silently replace a link
	CPython refuses to touch -- so the occupancy test asks about the link as
	well."

	self assertMatchesCPythonAt: 'dst_already_exists'.
	self assertMatchesCPythonAt: 'dst_is_a_dangling_link'.
	self assertMatchesCPythonAt: 'missing_parent_directory'.
%

category: 'Grail-Tests - symlink errors'
method: OsScandirSymlinkTestCase
testReadlinkDistinguishesNotALinkFromNotThere
	"EINVAL, not ENOENT: ``there is something there and it is not a link'' is
	a different fact from ``there is nothing there'', and callers branch on
	it.  Collapsing the two would be silent."

	self assertMatchesCPythonAt: 'readlink_on_a_regular_file'.
	self assertMatchesCPythonAt: 'readlink_on_a_missing_path'.
%
