Class {
	#name : 'OsUtimeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
OsUtimeTestCase >> assertMatchesCPythonAt: key [
	"Compare through repr: most answers here are booleans or TUPLES of them,
	which asString would flatten into the same text."

	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
OsUtimeTestCase >> setUp [
	"tests/python/os_utime.py, imported once per session.  The module body
	builds its tree, records every answer, and tears the tree down again, so
	the tests read recorded results (r, EXPECTED and g) rather than sharing
	filesystem state -- see PythonTestCase >> ___recordedFixture___:name:."

	testModule := self ___recordedFixture___: '/tests/python/os_utime.py'
		name: 'os_utime'

]

{ #category : 'Grail-Tests - errors' }
OsUtimeTestCase >> testAMissingPathIsFileNotFoundError [
	"touch(1) would CREATE the file, which is the opposite of what os.utime
	means, so the existence check happens before the command runs."

	self assertMatchesCPythonAt: 'missing_path'.

]

{ #category : 'Grail-Tests - the times are really set' }
OsUtimeTestCase >> testANoOpWouldBeCaught [
	"The one check whose only job is to fail against the crude stub this
	replaced.  A no-op leaves the mtime at the file's creation time; every
	other positive test here would still pass if os.utime did nothing and the
	fixture happened to ask for the value it already had."

	self assertMatchesCPythonAt: 'mtime_moved_off_creation'.

]

{ #category : 'Grail-Tests - errors' }
OsUtimeTestCase >> testAnOutOfRangeTimestampOverflows [
	"CPython says ``timestamp out of range for platform time_t''; Grail's
	boundary is the four-digit year its ISO formatting can render.  The exact
	boundary differs, the CLASS of error does not, and that is what a caller
	branches on."

	self assertMatchesCPythonAt: 'out_of_range_timestamp'.

]

{ #category : 'Grail-Tests - shell quoting' }
OsUtimeTestCase >> testAShellHostileFilenameSurvives [
	"os.utime runs touch(1), so the path is shell-quoted.  The name holds a
	space, a single quote and a SEMICOLON; quoting that is merely nearly right
	re-parses the last one as a command separator, which is arbitrary command
	execution rather than a wrong answer.  The times landing correctly is
	already most of the proof -- a re-parsed name would have been handed to
	touch as three fragments -- and the other two checks say the introduced
	command left nothing behind."

	self assertMatchesCPythonAt: 'hostile_name_keeps_its_times'.
	self assertMatchesCPythonAt: 'no_injected_command_ran'.
	self assertMatchesCPythonAt: 'nothing_extra_in_the_directory'.

]

{ #category : 'Grail-Tests - errors' }
OsUtimeTestCase >> testBadArgumentShapesAreTypeErrors [
	"CPython tests PyTuple_Check, so a LIST of two ints is a TypeError as
	surely as a string is.  Accepting a list would be the friendlier answer and
	the wrong one: code written against it then fails under CPython, which is
	the direction of breakage that costs the most to find."

	self assertMatchesCPythonAt: 'times_as_a_list'.
	self assertMatchesCPythonAt: 'times_of_three'.
	self assertMatchesCPythonAt: 'times_not_a_sequence'.
	self assertMatchesCPythonAt: 'times_of_strings'.
	self assertMatchesCPythonAt: 'ns_of_three'.
	self assertMatchesCPythonAt: 'ns_of_floats'.
	self assertMatchesCPythonAt: 'three_positional_arguments'.
	self assertMatchesCPythonAt: 'unexpected_keyword'.

]

{ #category : 'Grail-Tests - the times are really set' }
OsUtimeTestCase >> testBothTimesAreSetAndReadBack [
	"os.utime(path, (atime, mtime)) sets the two INDEPENDENTLY, so the fixture
	passes a different value for each: swapping them, or setting only one, is
	silent otherwise."

	self assertMatchesCPythonAt: 'returns_none'.
	self assertMatchesCPythonAt: 'atime_read_back'.
	self assertMatchesCPythonAt: 'mtime_read_back'.

]

{ #category : 'Grail-Tests - errors' }
OsUtimeTestCase >> testDirFdIsRejectedRatherThanIgnored [
	"A DOCUMENTED DIVERGENCE, so it is asserted here rather than in the
	CPython-compared table: CPython honours dir_fd for utime on Linux and
	macOS, and Grail has no dir_fd anywhere.  Accepting and ignoring it would
	resolve the path against the wrong directory and stamp the wrong file --
	a wrong answer rather than a missing feature -- so it says
	NotImplementedError instead.  dir_fd=None is the default and stays legal."

	| got |
	got := (testModule @env1:___pyAttrLoad___: #g) @env1:__getitem__: 'dir_fd'.
	self assert: got asString equals: 'NotImplementedError'.
	self assertMatchesCPythonAt: 'dir_fd_none_is_accepted'.

]

{ #category : 'Grail-Tests - symlinks' }
OsUtimeTestCase >> testFollowSymlinksIsHonouredInBothDirections [
	"The default FOLLOWS, so the target is stamped; follow_symlinks=False
	stamps the link itself and leaves the target alone.  Both halves are
	asserted, because an implementation that ignored the argument would pass
	either one on its own."

	self assertMatchesCPythonAt: 'default_follows_to_the_target'.
	self assertMatchesCPythonAt: 'follow_symlinks_false_stamps_the_link'.

]

{ #category : 'Grail-Tests - argument spellings' }
OsUtimeTestCase >> testOmittedTimesMeansNow [
	"Both spellings of ``now'' -- the argument absent, and an explicit None."

	self assertMatchesCPythonAt: 'omitted_means_now'.
	self assertMatchesCPythonAt: 'none_means_now'.

]

{ #category : 'Grail-Tests - argument spellings' }
OsUtimeTestCase >> testSubSecondPrecisionIsFlooredNotDiscarded [
	"ns= and a fractional seconds value both land on the whole second BELOW,
	rather than being rejected or rounded.  os.stat here answers whole seconds
	anyway, so flooring is the only answer that round-trips."

	self assertMatchesCPythonAt: 'ns_floors_to_whole_seconds'.
	self assertMatchesCPythonAt: 'fractional_seconds_floor'.

]

{ #category : 'Grail-Tests - the times are really set' }
OsUtimeTestCase >> testTheConversionToUtcHoldsAcrossTheYear [
	"``touch -t'' would have passed the first of these and failed the second by
	the DST offset, or the other way round depending on the gem's zone.  The
	pre-epoch value is the third trap: it is negative, so a truncating division
	in the civil-calendar conversion lands on the wrong DAY, not merely the
	wrong second."

	self assertMatchesCPythonAt: 'winter_exact'.
	self assertMatchesCPythonAt: 'summer_exact'.
	self assertMatchesCPythonAt: 'pre_epoch_exact'.

]

{ #category : 'Grail-Tests - errors' }
OsUtimeTestCase >> testTimesAndNsTogetherIsAValueError [
	"Not a TypeError: CPython treats it as two valid spellings of one argument
	rather than a mistyped one, and code catches accordingly."

	self assertMatchesCPythonAt: 'times_and_ns_together'.

]

{ #category : 'Grail-Tests - argument spellings' }
OsUtimeTestCase >> testTimesMayBeGivenAsAKeyword [
	"kaggle spells it ``os.utime(outfile, times=(t, t))'', so the keyword form
	is the one that actually has to work in the field."

	self assertMatchesCPythonAt: 'times_as_a_keyword'.

]
