! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for OsFileDescriptorsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'OsFileDescriptorsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
OsFileDescriptorsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! OsFileDescriptorsTestCase - os.open / read / readinto / write / lseek / fstat /
! ftruncate / isatty / close
! ===============================================================================
! Grail's os had no file-descriptor layer, so _pyio.FileIO -- built entirely on
! it -- died on its first os.open with AttributeError (test_bufio's two
! PyBufferSizeTest errors).  The functions now call libc, and the O_* constants
! are this platform's numbers rather than Darwin's everywhere.
!
! Constructing an ABCMeta class used to rescan the class chain for abstract
! methods on every construction (~17 ms), which made each _pyio open cost
! ~70 ms and test_bufio take 271 s; the answer is now cached per class.
!
! tests/python/os_file_descriptors.py holds the checks, run under real CPython
! 3.14 by scripts/check_python_fixtures.sh.  The one Grail-only behaviour -- a
! descriptor this session did not open is EBADF -- is pinned here, since
! CPython would happily use the gem's own descriptors.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
OsFileDescriptorsTestCase removeAllMethods.
OsFileDescriptorsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: OsFileDescriptorsTestCase
setUp

	importlib @env1:modules removeKey: #'os_file_descriptors' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/os_file_descriptors.py')
		name: 'os_file_descriptors'
%

category: 'Grail-Helpers'
method: OsFileDescriptorsTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: OsFileDescriptorsTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - os'
method: OsFileDescriptorsTestCase
testOpenWriteSeekStatAndClose

	self assertAll: #('open_answers_an_int' 'write_answers_the_count'
		'lseek_reports_the_position' 'fstat_describes_the_open_file'
		'isatty_is_false_for_a_file' 'close_answers_none' 'the_bytes_reach_the_file'
		'mode_and_flags_by_keyword')
%

category: 'Grail-Tests - os'
method: OsFileDescriptorsTestCase
testFlagsMeanWhatTheySayOnThisPlatform
	"Judged by what the file looks like afterwards, not by the numbers -- the
	numbers were Darwin's everywhere, which on Linux made O_CREAT mean O_TRUNC."

	self assertAll: #('flags_mean_what_they_say')
%

category: 'Grail-Tests - os'
method: OsFileDescriptorsTestCase
testEveryPlatformRowOfTheOpenFlags
	"Every row, from whichever machine runs this -- so the Linux rows are
	executed on a Mac and the Darwin row on Linux.  The first version could
	only compute its own platform's row, and the Linux branch no Mac run ever
	reached held a precedence slip (an unparenthesised ifTrue:ifFalse: fused
	into at:put:) that stopped os initialising on the first Linux install.

	Darwin's row is what CPython 3.14's os reports on macOS; the Linux rows are
	asm-generic/fcntl.h, with arm64's own O_NOFOLLOW (0100000)."

	| row installed |
	row := [:isDarwin :arch | | d |
		d := os @env1:___openFlagsDarwin: isDarwin arch: arch.
		#(#O_APPEND #O_CREAT #O_TRUNC #O_EXCL #O_NOFOLLOW #O_CLOEXEC)
			collect: [:k | d at: k]].
	self assert: (row value: true value: 'arm64')
		equals: #(8 512 1024 2048 256 16777216).
	self assert: (row value: false value: 'x86_64')
		equals: #(1024 64 512 128 131072 524288).
	self assert: (row value: false value: 'aarch64')
		equals: #(1024 64 512 128 32768 524288).
	"And the row this machine installed is the one its platform asks for."
	installed := os @env1:___openFlags.
	self assert: (self eval:
'import os
repr([os.O_APPEND, os.O_CREAT, os.O_TRUNC, os.O_EXCL, os.O_NOFOLLOW, os.O_CLOEXEC])
')
		equals: '[' , ((#(#O_APPEND #O_CREAT #O_TRUNC #O_EXCL #O_NOFOLLOW #O_CLOEXEC)
			collect: [:k | (installed at: k) printString])
				inject: '' into: [:acc :each | acc isEmpty ifTrue: [each] ifFalse: [acc , ', ' , each]]) , ']'
%

category: 'Grail-Tests - os'
method: OsFileDescriptorsTestCase
testReadReadintoAndFtruncate

	self assertAll: #('read_answers_at_most_n_bytes' 'readinto_a_bytearray'
		'readinto_a_memoryview_slice_lands_at_its_offset'
		'read_at_end_of_file_is_empty' 'ftruncate_shortens_the_file'
		'a_directory_opens_but_does_not_read')
%

category: 'Grail-Tests - os'
method: OsFileDescriptorsTestCase
testRefusalsMatchCPython

	self assertAll: #('negative_read_is_einval' 'readinto_refuses_bytes'
		'write_refuses_a_str' 'a_closed_descriptor_is_ebadf' 'ebadf_names_no_file'
		'isatty_of_a_closed_descriptor_is_false' 'open_of_a_missing_file_names_it'
		'open_refuses_an_embedded_nul')
%

category: 'Grail-Tests - os'
method: OsFileDescriptorsTestCase
testPyioFilesWork

	self assertAll: #('pyio_files_work' 'pyio_refuses_a_directory')
%

category: 'Grail-Tests - abc'
method: OsFileDescriptorsTestCase
testAbstractCheckIsCachedWithoutChangingItsAnswer

	self assertAll: #('an_abstract_class_is_refused_every_time'
		'a_concrete_subclass_constructs_every_time')
%

category: 'Grail-Tests - os'
method: OsFileDescriptorsTestCase
testGrailDivergesOnADescriptorItDidNotOpen
	"DELIBERATE DIVERGENCE (os.gs, the file-descriptor section): the gem's own
	descriptors -- stone and NetLDI sockets, its log -- share the process with
	Grail, so only a descriptor os.open handed out in this session is usable.
	Every other number answers what CPython answers for a closed one.  fstat and
	write are the probes because, were the guard missing, they would do no harm:
	fstat reads, and descriptor 1 is the gem's own stdout."

	self assert: (self eval:
'import os
out = []
for call in (lambda: os.fstat(0), lambda: os.write(1, b"x"), lambda: os.read(0, 1),
             lambda: os.lseek(2, 0, 0)):
    try:
        call()
        out.append("no error")
    except OSError as e:
        out.append(e.errno)
repr((out, os.isatty(0), os.isatty(1)))
') equals: '([9, 9, 9, 9], False, False)'
%
