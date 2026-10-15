Class {
	#name : 'ArchiveMetadataTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ArchiveMetadataTestCase >> assertMatchesCPythonAt: key [
	"Compare through repr: several answers are TUPLES of booleans, which
	asString would flatten into the same text."

	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
ArchiveMetadataTestCase >> setUp [
	"tests/python/archive_metadata.py, imported ONCE per session.  The module
	body builds its trees, extracts both archives, records every answer in
	``r'' and tears the trees down again, so the tests read recorded results
	rather than sharing filesystem state -- and read nothing else.

	It used to be re-imported in every test, redoing the whole workload (and
	its chmod(1)/touch(1) subprocesses) twenty times to read twenty slices of
	the same answers: 151s, the second most expensive class in the suite.
	See PythonTestCase >> ___recordedFixture___:name:."

	testModule := self ___recordedFixture___: '/tests/python/archive_metadata.py'
		name: 'archive_metadata'

]

{ #category : 'Grail-Tests - os.chmod' }
ArchiveMetadataTestCase >> testALeadingDashPathIsNotAnOption [
	"A path beginning with ``-'' is parsed by chmod(1) as FLAGS unless
	something stops it, and shell quoting is not that something: the shell
	strips the quotes before chmod sees argv.

	The habitual guard is ``--'', which os.symlink/os.readlink/os.utime all
	use.  BSD chmod DOES NOT IMPLEMENT IT.  Measured on macOS 26.6:

	    $ chmod 0600 -- normal
	    chmod: --: No such file or directory      (exit 1; `normal' IS chmod'ed)

	-- so ``--'' is consumed as a filename there, leaving a leading-dash path
	exactly as exposed as before.  GNU chmod does honour it, which is the worst
	shape a guard can have: it protects only the platform you are not testing
	on.  So os.chmod prefixes such a path with ``./'' instead, which names the
	same file and needs no cooperation from the utility."

	self assertMatchesCPythonAt: 'chmod_leading_dash_name'.

]

{ #category : 'Grail-Tests - tarfile.extract' }
ArchiveMetadataTestCase >> testAnArchiveCannotAskForMorePermissionThanCPythonWouldGive [
	"An archive is untrusted input, and `the tar said 0o4777' is not a reason
	to create a setuid, world-writable file.  CPython 3.14 extracts through its
	``data'' filter by default, which clamps mode to 0o755 and drops the high
	bits; Grail applies the same rules unconditionally, since it does not
	implement the filter protocol.  So a member claiming 0o777 comes out 0o755,
	and one claiming setuid comes out 0o755 with the bit gone.

	These two are the reason os.chmod was worth adding rather than wiring only
	the times: an extract that restores mode is a security surface, and the
	clamping is what makes it a safe one."

	self assertMatchesCPythonAt: 'tar_world_writable_is_clamped'.
	self assertMatchesCPythonAt: 'tar_setuid_is_stripped'.
	self assertMatchesCPythonAt: 'tar_setuid_bit_gone'.

]

{ #category : 'Grail-Tests - shutil.copystat' }
ArchiveMetadataTestCase >> testANoOpCopystatWouldBeCaught [
	"The check that exists for no other purpose: the destination's mode and
	mtime must have MOVED OFF the values it was given a moment earlier.  This
	is the shape the previous lane's post-mortem asked for -- a no-op os.utime
	passed 4 of 13 tests there because a fresh file's mtime already IS `now'."

	self assertMatchesCPythonAt: 'copystat_moved_dst_off_its_own_values'.

]

{ #category : 'Grail-Tests - shell quoting' }
ArchiveMetadataTestCase >> testAShellHostileMemberNameSurvivesExtraction [
	"The extracted path goes onto a chmod(1) and a touch(1) command line, and
	an archive is where a hostile name would actually come from.  The member is
	named ``od'd ; touch <marker> ; x.txt''.  Its metadata landing is already
	most of the proof -- a re-parsed name would have reached chmod as three
	fragments -- and the other two checks say the introduced command left
	nothing behind, in any directory it could plausibly have run in."

	self assertMatchesCPythonAt: 'tar_hostile_name_mode'.
	self assertMatchesCPythonAt: 'tar_hostile_name_mtime'.
	self assertMatchesCPythonAt: 'tar_no_injected_command_ran'.
	self assertMatchesCPythonAt: 'tar_nothing_extra_in_the_output'.

]

{ #category : 'Grail-Tests - os.chmod' }
ArchiveMetadataTestCase >> testChmodArgumentErrors [
	"chmod(1) would say nothing useful about a missing path -- and
	performOnServer: reports no exit status anyway -- so the existence check
	happens before the command runs."

	self assertMatchesCPythonAt: 'chmod_missing_path'.
	self assertMatchesCPythonAt: 'chmod_mode_not_an_int'.

]

{ #category : 'Grail-Tests - os.chmod' }
ArchiveMetadataTestCase >> testChmodIgnoresTheFileTypeBits [
	"os.chmod(f, 0o100640) leaves a file at 0o640 under CPython, because
	chmod(2) ignores the file-type field.  Grail masks to the low 12 bits to
	reproduce that, rather than handing chmod(1) a six-digit octal number and
	finding out what it makes of it."

	self assertMatchesCPythonAt: 'chmod_ignores_high_bits'.

]

{ #category : 'Grail-Tests - os.chmod' }
ArchiveMetadataTestCase >> testChmodSetsTheModeInBothDirections [
	"Both directions, because an implementation that only ever ORed bits in
	would pass the permissive half on its own.  0o666 down to 0o600 is the one
	that matters: a chmod that silently did nothing there leaves a file
	world-writable while telling the caller it is not."

	self assertMatchesCPythonAt: 'chmod_returns_none'.
	self assertMatchesCPythonAt: 'chmod_restrictive'.
	self assertMatchesCPythonAt: 'chmod_permissive'.
	self assertMatchesCPythonAt: 'chmod_666_down_to_600'.

]

{ #category : 'Grail-Tests - os.chmod' }
ArchiveMetadataTestCase >> testChmodWorksOnADirectory [
	"Directories go through the same path as files, and tarfile extraction
	relies on it."

	self assertMatchesCPythonAt: 'chmod_on_a_directory'.

]

{ #category : 'Grail-Tests - shutil.copy and copy2' }
ArchiveMetadataTestCase >> testCopy2CopiesContentModeAndTime [
	"copy2 USED TO BE copy(), which is what made `copy2 preserves metadata' a
	thing callers believed and could not check."

	self assertMatchesCPythonAt: 'copy2_returns_the_destination'.
	self assertMatchesCPythonAt: 'copy2_content'.
	self assertMatchesCPythonAt: 'copy2_mode'.
	self assertMatchesCPythonAt: 'copy2_mtime'.

]

{ #category : 'Grail-Tests - shutil.copy and copy2' }
ArchiveMetadataTestCase >> testCopyCopiesTheModeButNotTheTimes [
	"CPython's copy() is copyfile + copymode.  Grail's dropped the mode until
	this lane, and the difference was invisible for the reason this whole
	fixture is built around: with a 0o644 source the destination landed on
	0o644 either way.  The source here is 0o600."

	self assertMatchesCPythonAt: 'copy_copies_the_mode'.
	self assertMatchesCPythonAt: 'copy_does_not_copy_mtime'.

]

{ #category : 'Grail-Tests - shutil.copystat' }
ArchiveMetadataTestCase >> testCopyfileIsContentOnly [
	"copyfile copies bytes and nothing else in CPython, so a copystat that
	leaked into it would be a deviation in the other direction."

	self assertMatchesCPythonAt: 'copyfile_does_not_copy_mtime'.

]

{ #category : 'Grail-Tests - shutil.copystat' }
ArchiveMetadataTestCase >> testCopymodeIsModeOnly [
	"copymode moves the permission bits and NOT the times.  Both files carry
	fixed, different mtimes, so `they happened to be equal' cannot make the
	second half pass."

	self assertMatchesCPythonAt: 'copymode_returns_none'.
	self assertMatchesCPythonAt: 'copymode_mode'.
	self assertMatchesCPythonAt: 'copymode_leaves_mtime_alone'.

]

{ #category : 'Grail-Tests - shutil.copystat' }
ArchiveMetadataTestCase >> testCopystatCopiesModeAndBothTimes [
	"The destination starts at 0o666 with a DIFFERENT fixed mtime, so neither
	half can pass by landing where it already was.  The two times are copied
	independently -- the fixture gives the source a different atime and mtime,
	so an implementation that set both from one of them is caught."

	self assertMatchesCPythonAt: 'copystat_returns_none'.
	self assertMatchesCPythonAt: 'copystat_mode'.
	self assertMatchesCPythonAt: 'copystat_mtime'.
	self assertMatchesCPythonAt: 'copystat_atime'.

]

{ #category : 'Grail-Tests - shutil.copytree' }
ArchiveMetadataTestCase >> testCopytreePreservesMetadataThroughoutTheTree [
	"copytree copies files with copy2 and directories with copystat, which is
	what CPython's default copy_function=copy2 does.  Leaving copytree on plain
	copyfile while copy2 preserved metadata would have been the same partial
	fidelity this lane exists to remove, one level up."

	self assertMatchesCPythonAt: 'copytree_file_mode'.
	self assertMatchesCPythonAt: 'copytree_file_mtime'.
	self assertMatchesCPythonAt: 'copytree_nested_mode'.
	self assertMatchesCPythonAt: 'copytree_nested_mtime'.

]

{ #category : 'Grail-Tests - shutil.copytree' }
ArchiveMetadataTestCase >> testCopytreeStampsADirectoryAfterFillingIt [
	"Writing a file into a directory resets that directory's mtime, so a
	copystat applied to the directory BEFORE its contents would be silently
	undone.  The expected value is a fixed instant, so `undone' shows up."

	self assertMatchesCPythonAt: 'copytree_directory_mtime'.

]

{ #category : 'Grail-Tests - tarfile.extract' }
ArchiveMetadataTestCase >> testExtractallStampsDirectoriesLast [
	"A directory's mtime is applied after every member has been written, in
	reverse name order -- CPython defers the same way, because writing a file
	into a directory resets that directory's mtime.  A stamp applied at
	creation time would read as `now' here."

	self assertMatchesCPythonAt: 'tar_directory_mtime'.

]

{ #category : 'Grail-Tests - tarfile.extract' }
ArchiveMetadataTestCase >> testExtractRestoresModeAndMtime [
	"The user-visible win: an archive extracted with Grail now carries the
	times and permissions the archive recorded.  0o600 and 0o755 are both
	unlike what a freshly created file gets, and every mtime is years old."

	self assertMatchesCPythonAt: 'tar_private_mode'.
	self assertMatchesCPythonAt: 'tar_private_mtime'.
	self assertMatchesCPythonAt: 'tar_exec_mode'.
	self assertMatchesCPythonAt: 'tar_exec_mtime'.

]

{ #category : 'Grail-Tests - os.chmod' }
ArchiveMetadataTestCase >> testFollowSymlinksFalseIsRejectedRatherThanIgnored [
	"A DOCUMENTED DIVERGENCE, so it is asserted here rather than in the
	CPython-compared table: CPython on macOS has lchmod and supports this;
	CPython on LINUX does not, answers False from
	``os.chmod in os.supports_follow_symlinks'', and copystat skips the call.
	Grail matches Linux -- the platform CI measures -- and refuses rather than
	faking it, because the two chmod(1) implementations disagree about how:
	BSD chmod has ``-h'' and GNU chmod has no such flag, so a faked version
	would silently follow the link on Linux and change the WRONG file's
	permissions.  That is a security bug, not a missing feature."

	self
		should: [self eval: 'import os
os.chmod("$TMP/archive_meta_fs", 0o600, follow_symlinks=False)']
		raise: NotImplementedError

]

{ #category : 'Grail-Tests - tarfile.extract' }
ArchiveMetadataTestCase >> testSetAttrsFalseIsHonoured [
	"extract(member, path, False) writes the bytes and no attributes, so the
	mtime stays at `now' rather than the archive's."

	self assertMatchesCPythonAt: 'tar_set_attrs_false_leaves_mtime'.

]

{ #category : 'Grail-Tests - zipfile restores nothing' }
ArchiveMetadataTestCase >> testZipExtractionRestoresNothingJustAsCPythonDoes [
	"CONFORMANCE, not a gap.  CPython's ZipFile._extract_member writes the file
	and stops: there is no chmod and no utime anywhere in CPython's zipfile, so
	a member's external_attr mode and its DOS date_time are dropped on
	extraction by CPython too.

	This is asserted rather than merely left alone because the module header
	used to list it as a Grail deviation caused by the missing os.chmod -- an
	invitation to `fix' it once os.chmod existed, which would have INTRODUCED a
	deviation.  The last check reads the mode the archive records and that
	extraction ignores, so the two halves cannot drift apart unnoticed."

	self assertMatchesCPythonAt: 'zip_content_is_extracted'.
	self assertMatchesCPythonAt: 'zip_does_not_restore_mtime'.
	self assertMatchesCPythonAt: 'zip_does_not_restore_mode'.
	self assertMatchesCPythonAt: 'zip_records_the_mode_it_ignores'.

]
