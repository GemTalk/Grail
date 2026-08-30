! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- os class (Python 'os' module)
expectvalue /Class
doit
module subclass: 'os'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
os comment:
'Python os module.

Provides operating system interfaces for file/directory operations,
process management, and environment variables.
See https://docs.python.org/3/library/os.html
'
%

expectvalue /Class
doit
os category: 'Grail-Modules'
%

! ------- os_PathLike class (Python 'os.PathLike' ABC)
expectvalue /Class
doit
object subclass: 'os_PathLike'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
os_PathLike comment:
'Python os.PathLike - the abstract base class for path-like objects
(PEP 519).  isinstance(x, os.PathLike) is true for any object whose type
defines __fspath__ (duck-typed); str/bytes are NOT PathLike.'
%

expectvalue /Class
doit
os_PathLike category: 'Grail-Modules'
%

! ------- os_Environ class (Python 'os.environ')
expectvalue /Class
doit
object subclass: 'os_Environ'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
os_Environ comment:
'``os.environ'' -- a LIVE read-through view of this gem''s environment.

Every lookup calls ``System class >> gemEnvironmentVariable:'' at the moment
it is asked, so a variable set after this object was built is still seen, and
``os.environ[k] = v'' really does putenv (CPython semantics: the child
processes of GsHostProcess inherit it).

DEVIATION -- enumeration is partial.  GemStone exposes no way to READ BACK the
environment block: ``gemEnvironmentVariable:'' answers one NAMED variable and
there is no ``environ''/``getenviron'' primitive.  So ``keys()'', ``items()'',
``values()'', ``__iter__'' and ``__len__'' can only report names this session
has already touched -- those probed at first access (a curated list of the
usual POSIX/toolchain names), plus any name later read or written through this
object.  A variable that is set in the process but has never been named here
is invisible to iteration while remaining perfectly visible to ``environ[k]'',
``.get(k)'' and ``k in environ''.

This is the one Grail surface where a missing kernel primitive is visible
directly in Python semantics rather than in performance or an error message;
a ``System class >> gemEnvironment'' answering a Dictionary would close it and
let this class drop the probe list entirely.'
%

expectvalue /Class
doit
os_Environ category: 'Grail-Modules'
%

! ------- os_DirEntry class (Python 'os.DirEntry')
expectvalue /Class
doit
object subclass: 'os_DirEntry'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
os_DirEntry comment:
'One entry from ``os.scandir()'' -- CPython''s DirEntry.

Carries the entry''s ``name'' and full ``path'' and answers the type questions
about it: is_dir / is_file / is_symlink / stat / inode, each with the
follow_symlinks argument where CPython has one.

WHAT IT DOES NOT DO IS CACHE.  CPython''s DirEntry caches the stat results it
has been asked for, which is what makes scandir faster than listdir + stat,
and its documentation warns that a cached answer may already be stale.  This
one re-stats on every question, so it is SLOWER and FRESHER than CPython''s.
Code that reads an entry twice across a filesystem change therefore sees the
change here and might not there -- a difference in CPython''s favour for speed
and in this one''s for accuracy, and in neither''s for conformance.

is_junction is always false: junctions are a Windows concept, and Grail''s os
reports ``posix''.
'
%

expectvalue /Class
doit
os_DirEntry category: 'Grail-Filesystem'
%

! ------- os_ScandirIterator class (Python 'posix.ScandirIterator')
expectvalue /Class
doit
object subclass: 'os_ScandirIterator'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
os_ScandirIterator comment:
'What ``os.scandir()'' answers -- CPython''s posix.ScandirIterator.

An iterator (``__iter__'' answers self, ``__next__'' advances) that is ALSO a
context manager, because ``with os.scandir(p) as it:'' is the spelling CPython''s
own library uses and a bare generator could not offer it.  That is the reason
this is a class rather than a PythonGenerator: the iterator protocol alone would
have been a two-line generator, and every ``with'' over it would have failed
with an AttributeError on __enter__.

The entries are read EAGERLY, at scandir() time.  CPython''s reads the directory
in blocks as you iterate; Grail''s cannot, because GsFile answers a whole
directory listing in one call and there is no partial-read primitive under it.
So close() and __exit__ release the held list rather than a directory handle,
and an iterator left unclosed leaks nothing -- which is why no ResourceWarning
is emitted where CPython emits one.
'
%

expectvalue /Class
doit
os_ScandirIterator category: 'Grail-Filesystem'
%

set compile_env: 0

! ------------------- Remove existing Python methods from os
expectvalue /Metaclass3
doit
os removeAllMethods: 1.
os class removeAllMethods: 1.
os_PathLike removeAllMethods: 1.
os_PathLike class removeAllMethods: 1.
os_Environ removeAllMethods.
os_Environ class removeAllMethods.
os_Environ removeAllMethods: 1.
os_Environ class removeAllMethods: 1.
os_DirEntry removeAllMethods.
os_DirEntry class removeAllMethods.
os_DirEntry removeAllMethods: 1.
os_DirEntry class removeAllMethods: 1.
os_ScandirIterator removeAllMethods.
os_ScandirIterator class removeAllMethods.
os_ScandirIterator removeAllMethods: 1.
os_ScandirIterator class removeAllMethods: 1.
%

set compile_env: 1

! ===============================================================================
! Initialization — constants and stored attributes
! ===============================================================================

category: 'Grail-Initialization'
method: os
initialize
	self @env0:at: #name put: 'posix'.
	self @env0:at: #sep put: '/'.
	self @env0:at: #pathsep put: ':'.
	self @env0:at: #curdir put: '.'.
	self @env0:at: #pardir put: '..'.
	self @env0:at: #extsep put: '.'.
	self @env0:at: #altsep put: None.
	self @env0:at: #devnull put: '/dev/null'.
	"open(2) flag constants (POSIX values, macOS/Linux common set)."
	self @env0:at: #O_RDONLY put: 0.
	self @env0:at: #O_WRONLY put: 1.
	self @env0:at: #O_RDWR put: 2.
	self @env0:at: #O_APPEND put: 8.
	self @env0:at: #O_CREAT put: 512.
	self @env0:at: #O_TRUNC put: 1024.
	self @env0:at: #O_EXCL put: 2048.
	self @env0:at: #O_NOFOLLOW put: 256.
	self @env0:at: #O_CLOEXEC put: 16777216.
	self @env0:at: #linesep put: ((Character @env0:lf) @env0:asString).
	"os.supports_* -- the sets CPython uses to advertise which os functions
	accept a file DESCRIPTOR in place of a path, a dir_fd, follow_symlinks=False,
	or effective ids.  Every one is EMPTY here, and empty is the HONEST answer
	rather than a placeholder: Grail's os functions take paths, and not one of
	them accepts an fd or a dir_fd.

	A caller probes these as sets -- ``os.stat in os.supports_fd'' -- and takes
	its path-based branch when the answer is no, which is the branch that works.
	filelock asks exactly that at import time, and before these existed the probe
	raised AttributeError, so ``import filelock'' failed outright.  Answering
	nothing lets it import AND steers it onto the path that Grail can serve;
	answering a non-empty set would do the opposite."
	self @env0:at: #supports_fd put: (set ___new___).
	self @env0:at: #supports_dir_fd put: (set ___new___).
	self @env0:at: #supports_follow_symlinks put: (set ___new___).
	self @env0:at: #supports_effective_ids put: (set ___new___).
	self @env0:at: #path put: (os_path instance).
	self @env0:at: #PathLike put: os_PathLike.
	"``os.DirEntry'' is a real module attribute in CPython -- code type-tests
	scandir results against it -- even though nothing can construct one."
	self @env0:at: #DirEntry put: os_DirEntry.
	"Pre-store fsdecode as a BoundMethod so ``from os import
	fsdecode'' (werkzeug's file_storage) reads the callable
	directly via the ImportFromAst __pyAttrLoad path."
	self @env0:dynamicInstVarAt: #fsdecode put: (BoundMethod receiver: self selector: #fsdecode).
	self @env0:dynamicInstVarAt: #fsencode put: (BoundMethod receiver: self selector: #fsencode).
	self @env0:dynamicInstVarAt: #fspath put: (BoundMethod receiver: self selector: #fspath)

	"``os.environ'' is deliberately NOT initialised here.  It is a live
	read-through view (os_Environ) held per session in SessionTemps: the
	environment is per-gem-process runtime state, so it must not sit in a
	slot that could be committed.  See the `environ' accessor."
%

category: 'Grail-Filesystem'
classmethod: os_PathLike
__instancecheck__: instance
	"Python os.PathLike.__subclasshook__: any object whose type defines
	``__fspath__'' is path-like (duck-typed, PEP 519).  str / bytes do
	NOT define __fspath__, so they are not PathLike — matching CPython.
	Consulted by builtins>>___isInstanceSingle___:of: when the second
	isinstance/issubclass argument is os.PathLike.  Walks the class chain
	(not just the own method dict) so a subclass that inherits __fspath__
	is still recognised."

	^ (instance @env0:class @env0:whichClassIncludesSelector: #'__fspath__' environmentId: 1) notNil
%

category: 'Grail-Filesystem'
method: os
fspath: path
	"``os.fspath(path)'' — accept either a string-like or an object
	with ``__fspath__'' and return a string/bytes path.  Grail
	short-circuits: strings and bytes pass through; user objects
	delegate to __fspath__ if defined."

	(path isKindOf: CharacterCollection) ifTrue: [^ path].
	(path isKindOf: ByteArray) ifTrue: [^ path].
	((path @env0:class @env0:methodDictForEnv: 1) @env0:includesKey: #'__fspath__')
		ifTrue: [^ path __fspath__].
	TypeError ___signal___: 'expected str, bytes, or os.PathLike'
%

category: 'Grail-Filesystem'
method: os
___fsPath___: path
	"Coerce a PathLike argument (PEP 519) to its string path for the
	filesystem entry points below.  UNLIKE fspath: this is permissive:
	anything without ``__fspath__'' passes through UNCHANGED rather than
	raising TypeError, so adding the coercion cannot turn a call that used
	to work into an error.  fspath: stays strict because it is the public
	``os.fspath()'', where CPython does raise.

	Every path-taking function in this module and os_path needs it: without
	it a pathlib.Path reached the GsFile primitives, which send
	``encodeAsUTF8'' to whatever they are given, and a Path does not
	understand it -- a MessageNotUnderstood that is UNCATCHABLE from
	Python, escaping even ``except Exception''.  The shape that found this
	was ``shutil.rmtree(Path(tempfile.mkdtemp()))'', where rmtree's
	os.listdir killed the session outright.

	Probes the whole class chain (whichClassIncludesSelector:, like
	os_PathLike>>__instancecheck__) rather than the own method dict, so a
	Path SUBCLASS that inherits __fspath__ is coerced too."

	((path @env0:class @env0:whichClassIncludesSelector: #'__fspath__' environmentId: 1) notNil)
		ifTrue: [^ path __fspath__].
	^ path
%

category: 'Grail-Filesystem'
method: os
fsdecode: filename
	"``os.fsdecode(filename)'' — decode a bytes filename to str using
	the filesystem encoding.  Grail uses UTF-8 throughout.  Bytes
	input decodes; str input passes through."

	(filename isKindOf: ByteArray)
		ifTrue: [^ filename decode: 'utf-8'].
	^ filename
%

category: 'Grail-Filesystem'
method: os
fsencode: filename
	"``os.fsencode(filename)'' — inverse of fsdecode."

	(filename isKindOf: CharacterCollection)
		ifTrue: [^ filename encode: 'utf-8'].
	^ filename
%

! ===============================================================================
! Stored-attribute accessors
! ===============================================================================

category: 'Grail-Constants'
method: os
sep
	^ self @env0:at: #sep
%

category: 'Grail-Constants'
method: os
environ
	"os.environ — a live read-through view of this gem's environment.

	This used to answer a bare KeyValueDictionary that was created empty
	at module-init and NEVER populated: the docstring promised a
	read-through that no code implemented, so ``os.environ.get('HOME')''
	answered None while ``os.getenv('HOME')'' answered the real value.
	Anything reading configuration the documented way (Flask's
	``FLASK_DEBUG'' / ``FLASK_SKIP_DOTENV'', Django's ``DJANGO_SETTINGS_MODULE'')
	silently saw an unset variable.

	Session-local, per Concurrency.md: the environment belongs to this gem
	process, so the view must not live anywhere a commit could carry it."

	| temps env |
	temps := SessionTemps @env0:current.
	env := temps @env0:at: #'___GrailOsEnviron___' ifAbsent: [nil].
	env == nil ifTrue: [
		env := os_Environ @env0:new.
		env ___seedKnownNames___.
		temps @env0:at: #'___GrailOsEnviron___' put: env.
	].
	^ env
%

! ===============================================================================
! os_Environ — the live environment view behind ``os.environ''
! ===============================================================================

category: 'Grail-Private'
method: os_Environ
___knownNames___
	"The names this session has touched — the only ones enumeration can
	report.  See the class comment for why this list exists at all."

	| names |
	names := self @env0:dynamicInstVarAt: #'_known'.
	names == nil ifTrue: [
		names := IdentitySet @env0:new.
		self @env0:dynamicInstVarAt: #'_known' put: names.
	].
	^ names
%

category: 'Grail-Private'
method: os_Environ
___note___: name
	"Record a name as known, so later iteration can report it."

	name == nil ifTrue: [^ self].
	self ___knownNames___ @env0:add: ((name @env0:asString) @env0:asSymbol).
%

category: 'Grail-Private'
method: os_Environ
___seedKnownNames___
	"Probe the usual suspects once, so ``list(os.environ)'' is useful
	rather than empty on a fresh session.  Only names that are actually
	SET are kept.  A ``System class >> gemEnvironment'' primitive would
	make this whole method unnecessary — see the class comment.

	The ``*_proxy'' names are here because urllib.request.getproxies_environment
	SCANS os.environ for names ending in ``_proxy'' — CPython's algorithm, which
	requests calls on every request.  Without them an inherited ``http_proxy''
	would be perfectly visible to ``environ['http_proxy']'' and invisible to the
	scan, so Grail would silently ignore a proxy the shell had set.  A scheme
	nobody thought to list is still invisible until some code names it; that is
	the same missing primitive, not a separate bug.  REQUEST_METHOD rides along
	because the same function tests for it (the CGI ``Proxy:'' header quirk,
	CVE-2016-1000110) — that test is a ``in environ'' read-through and does not
	actually need the seed, but a reader who finds one name here should find the
	other."

	#( 'PATH' 'HOME' 'USER' 'LOGNAME' 'SHELL' 'PWD' 'OLDPWD' 'TMPDIR' 'TEMP' 'TMP'
	   'LANG' 'LC_ALL' 'LC_CTYPE' 'TERM' 'TZ' 'HOSTNAME' 'EDITOR' 'PAGER'
	   'GEMSTONE' 'GEMSTONE_NAME' 'GEMSTONE_GLOBAL_DIR' 'GEMSTONE_SYS_CONF'
	   'GEMSTONE_EXE_CONF' 'GEMSTONE_LOG' 'GRAIL_DIR' 'GRAIL_NETLDI'
	   'GRAIL_CODEGEN_TRACE_DIR' 'GRAIL_TEST_WORKERS'
	   'PYTHONPATH' 'PYTHONHOME' 'PYTHONHASHSEED' 'PYTHONUTF8' 'VIRTUAL_ENV'
	   'FLASK_DEBUG' 'FLASK_APP' 'FLASK_SKIP_DOTENV' 'DJANGO_SETTINGS_MODULE'
	   'CI' 'GITHUB_ACTIONS' 'SSH_AUTH_SOCK' 'DISPLAY' 'COLUMNS' 'LINES'
	   'http_proxy' 'HTTP_PROXY' 'https_proxy' 'HTTPS_PROXY'
	   'ftp_proxy' 'FTP_PROXY' 'all_proxy' 'ALL_PROXY'
	   'no_proxy' 'NO_PROXY' 'REQUEST_METHOD' )
		@env0:do: [:n |
			(System @env0:gemEnvironmentVariable: n) == nil
				ifFalse: [ self ___note___: n ] ].
%

category: 'Grail-Private'
method: os_Environ
___liveNames___
	"Known names that are still set right now, as Strings."

	| out |
	out := list ___new___.
	self ___knownNames___ @env0:do: [:sym |
		(System @env0:gemEnvironmentVariable: (sym @env0:asString)) == nil
			ifFalse: [ out append: (sym @env0:asString) ] ].
	^ out
%

category: 'Grail-Access Methods'
method: os_Environ
__getitem__: key
	"environ[key] — reads through; KeyError when unset, as CPython."

	| v |
	v := System @env0:gemEnvironmentVariable: (key @env0:asString).
	v == nil ifTrue: [ KeyError ___signal___: (key @env0:asString) ].
	self ___note___: key.
	^ v
%

category: 'Grail-Access Methods'
method: os_Environ
get: key
	^ self get: key _: None
%

category: 'Grail-Access Methods'
method: os_Environ
get: key _: default
	| v |
	v := System @env0:gemEnvironmentVariable: (key @env0:asString).
	v == nil ifTrue: [^ default].
	self ___note___: key.
	^ v
%

category: 'Grail-Access Methods'
method: os_Environ
__contains__: key
	| v |
	v := System @env0:gemEnvironmentVariable: (key @env0:asString).
	v == nil ifTrue: [^ false].
	self ___note___: key.
	^ true
%

category: 'Grail-Access Methods'
method: os_Environ
__setitem__: key _: value
	"environ[key] = value — really does putenv, so a child process
	forked afterwards inherits it (CPython semantics)."

	System @env0:gemEnvironmentVariable: (key @env0:asString) put: (value @env0:asString).
	self ___note___: key.
	^ None
%

category: 'Grail-Access Methods'
method: os_Environ
__delitem__: key
	"del environ[key] — unsetenv.  KeyError when unset, as CPython."

	(System @env0:gemEnvironmentVariable: (key @env0:asString)) == nil
		ifTrue: [ KeyError ___signal___: (key @env0:asString) ].
	[ System @env0:gemEnvironmentVariable: (key @env0:asString) put: nil ]
		@env0:on: AbstractException
		do: [:ex | System @env0:gemEnvironmentVariable: (key @env0:asString) put: '' ].
	^ None
%

category: 'Grail-Access Methods'
method: os_Environ
setdefault: key _: default
	| v |
	v := System @env0:gemEnvironmentVariable: (key @env0:asString).
	v == nil ifFalse: [ self ___note___: key. ^ v ].
	self __setitem__: key _: default.
	^ default
%

category: 'Grail-Access Methods'
method: os_Environ
pop: key _: default
	| v |
	v := System @env0:gemEnvironmentVariable: (key @env0:asString).
	v == nil ifTrue: [^ default].
	self __delitem__: key.
	^ v
%

category: 'Grail-Access Methods'
method: os_Environ
copy
	"environ.copy() — a PLAIN dict snapshot, as CPython.  Mutating the copy
	must not touch the process, which is exactly why callers reach for it
	(test.support.os_helper.EnvironmentVarGuard and CPython's own
	test_hash both save the environment this way before changing it)."

	| d |
	d := dict ___new___.
	(self ___liveNames___) @env0:do: [:n |
		d __setitem__: n _: (System @env0:gemEnvironmentVariable: n) ].
	^ d
%

category: 'Grail-Access Methods'
method: os_Environ
pop: key
	"environ.pop(key) — KeyError when unset, as CPython."

	| v |
	v := System @env0:gemEnvironmentVariable: (key @env0:asString).
	v == nil ifTrue: [ KeyError ___signal___: (key @env0:asString) ].
	self __delitem__: key.
	^ v
%

category: 'Grail-Access Methods'
method: os_Environ
setdefault: key
	^ self setdefault: key _: ''
%

category: 'Grail-Access Methods'
method: os_Environ
update: other
	"environ.update(mapping) — each entry written through putenv."

	(other keys) @env0:do: [:k |
		self __setitem__: k _: (other __getitem__: k) ].
	^ None
%

category: 'Grail-Access Methods'
method: os_Environ
clear
	"environ.clear() — unsets every name this view can SEE.  Necessarily
	partial for the same reason iteration is (no environment-block read),
	so it clears the known set rather than the true environment; CPython
	clears everything.  Recorded here rather than refused because the
	partial behaviour is still the useful one for a test guard."

	(self ___liveNames___) @env0:do: [:n | self __delitem__: n ].
	^ None
%

category: 'Grail-Iteration'
method: os_Environ
keys
	^ self ___liveNames___
%

category: 'Grail-Iteration'
method: os_Environ
__iter__
	^ (self ___liveNames___) __iter__
%

category: 'Grail-Iteration'
method: os_Environ
__len__
	^ (self ___liveNames___) __len__
%

category: 'Grail-Iteration'
method: os_Environ
values
	| out |
	out := list ___new___.
	(self ___liveNames___) @env0:do: [:n |
		out append: (System @env0:gemEnvironmentVariable: n) ].
	^ out
%

category: 'Grail-Iteration'
method: os_Environ
items
	| out |
	out := list ___new___.
	(self ___liveNames___) @env0:do: [:n |
		out append: (tuple @env0:with: n with: (System @env0:gemEnvironmentVariable: n)) ].
	^ out
%

category: 'Grail-Conversion'
method: os_Environ
__repr__
	| parts |
	parts := list ___new___.
	(self ___liveNames___) @env0:do: [:n |
		parts append:
			((n __repr__) @env0:, ': ' @env0:, ((System @env0:gemEnvironmentVariable: n) __repr__)) ].
	^ 'environ({' @env0:, ((', ') join: parts) @env0:, '})'
%

category: 'Grail-Constants'
method: os
pathsep
	^ self @env0:at: #pathsep
%

category: 'Grail-Constants'
method: os
linesep
	^ self @env0:at: #linesep
%

category: 'Grail-Path Module'
method: os
path
	^ self @env0:at: #path
%

! ===============================================================================
! Fast-path callables — directory operations
! ===============================================================================

category: 'Grail-Process Information'
method: os
cpu_count
	"os.cpu_count() — logical CPU count, from the host.

	This used to answer a fixed 4 on the belief that ``GemStone has no
	portable host-CPU primitive exposed to gems''.  That was wrong:
	``System class >> hostCpuCount'' answers the host's CPU count and is
	what CPython's os.cpu_count() means.  Consumers size worker pools
	from it (twilio's TwilioHttpClient computes ``min(32, os.cpu_count()
	+ 4)`` for its adapter pool), so the fixed value under-provisioned
	every one of them on any machine with more than four cores.

	Answers None if the primitive cannot report a count, matching
	CPython's documented return type."

	| n |
	n := System @env0:hostCpuCount.
	(n isKindOf: Integer) ifFalse: [^ None].
	n @env0:<= 0 ifTrue: [^ None].
	^ n
%

category: 'Grail-Process'
method: os
getpid
	"os.getpid() — the current process id, i.e. this gem's OS process.

	test.support.os_helper appends it to its scratch filename precisely so
	that concurrent sessions do not collide.  Without getpid it fell back to
	the bare name ``@test'', which matters here: run_cpython_suite.sh runs
	four modules CONCURRENTLY in one directory, so they were all sharing a
	single scratch file."

	^ System @env0:gemProcessId
%

category: 'Grail-File and Directory Operations'
method: os
getcwd
	"os.getcwd() — return the current working directory."

	| result |
	result := GsFile @env0:_directoryPrim: 2 with: nil with: nil.
	(result isKindOf: String) ifTrue: [^ result].
	(result isKindOf: Utf8) ifTrue: [^ result @env0:decodeToUnicode].
	(result isKindOf: Utf16) ifTrue: [^ result @env0:decodeToUnicode].
	^ result @env0:asUnicodeString
%

category: 'Grail-File and Directory Operations'
method: os
chdir: aPath
	"os.chdir(path) — change the current working directory."

	| result path |
	path := self ___fsPath___: aPath.
	result := GsFile @env0:_directoryPrim: 0 with: path with: nil.
	result == nil ifTrue: [
		OSError ___signal___: ('Cannot change directory to: ' @env0:, (path @env0:printString))
	].
	^ None
%

category: 'Grail-File and Directory Operations'
method: os
mkdir: aPath
	"os.mkdir(path) — create a directory."

	| result path |
	path := self ___fsPath___: aPath.
	result := GsFile @env0:createServerDirectory: path.
	result == nil ifTrue: [
		OSError ___signal___: ('Cannot create directory: ' @env0:, (path @env0:printString))
	].
	^ None
%

category: 'Grail-File and Directory Operations'
method: os
mkdir: aPath _: mode
	"os.mkdir(path, mode) — create a directory with numeric mode."

	| result path |
	path := self ___fsPath___: aPath.
	result := GsFile @env0:createServerDirectory: path mode: mode.
	result == nil ifTrue: [
		OSError ___signal___: ('Cannot create directory: ' @env0:, (path @env0:printString))
	].
	^ None
%

category: 'Grail-File and Directory Operations'
method: os
makedirs: aPath
	"os.makedirs(path) — recursive directory creation."

	| parts currentPath sep path |
	path := self ___fsPath___: aPath.
	sep := '/'.
	parts := $/ @env0:split: path.
	currentPath := ''.
	parts @env0:do: [:part |
		(part @env0:isEmpty) ifFalse: [
			currentPath := (currentPath @env0:isEmpty)
				ifTrue: [
					(path @env0:beginsWith: sep)
						ifTrue: [sep @env0:, part]
						ifFalse: [part]
				]
				ifFalse: [(currentPath @env0:, sep) @env0:, part].
			"``== true'', and stat when the probe answered NIL: existsOnServer:
			answers nil rather than false when the probe itself errors -- which
			makedirs walks straight into, since a PARENT component may be a plain
			file (ENOTDIR).  A bare ifFalse: on that nil is ImproperOperation
			(error 2085), an uncatchable Smalltalk error; ___statOrSignal___:
			raises the NotADirectoryError CPython raises here."
			(GsFile @env0:existsOnServer: currentPath) == true ifFalse: [
				(GsFile @env0:existsOnServer: currentPath) == nil ifTrue: [
					self ___statOrSignal___: currentPath isLstat: false].
				self mkdir: currentPath
			]
		]
	].
	^ None
%

category: 'Grail-File and Directory Operations'
method: os
rmdir: aPath
	"os.rmdir(path) — remove a directory."

	| result path |
	path := self ___fsPath___: aPath.
	result := GsFile @env0:removeServerDirectory: path.
	result == nil ifTrue: [
		OSError ___signal___: ('Cannot remove directory: ' @env0:, (path @env0:printString))
	].
	^ None
%

category: 'Grail-File and Directory Operations'
method: os
remove: aPath
	"os.remove(path) — remove a file.

	Raises FileNotFoundError (an OSError subclass, so existing ``except
	OSError'' handlers are unaffected) when the file is absent, which is what
	CPython raises and what callers actually test for -- test.support's
	os_helper.unlink() swallows exactly FileNotFoundError/NotADirectoryError
	and would otherwise propagate a bare OSError out of every cleanup."

	| result path |
	path := self ___fsPath___: aPath.
	"``exists'' FOLLOWS a symlink, so a DANGLING one -- a link whose target is
	gone, which is legal and which os.symlink can create deliberately -- looked
	absent and raised FileNotFoundError instead of being unlinked.  CPython
	removes the LINK, and never consults the target at all.  The extra islink
	test is what makes the link itself visible here; a bare exists() cannot see
	one whose target does not exist."
	((self exists: path) @env0:or: [self ___isLink___: path]) ifFalse: [
		FileNotFoundError ___signal___:
			('No such file or directory: ' @env0:, (path @env0:printString))
	].
	result := GsFile @env0:removeServerFile: path.
	result == nil ifTrue: [
		OSError ___signal___: ('Cannot remove file: ' @env0:, (path @env0:printString))
	].
	^ None
%

category: 'Grail-File and Directory Operations'
method: os
unlink: path
	"os.unlink(path) — remove a file.  Semantically identical to remove() in
	CPython, and the spelling test.support.os_helper uses to clean up after
	itself.

	Its absence had two visible consequences.  Every vendored test that
	touched os_helper.TESTFN raised ``AttributeError: module has no attribute
	'unlink''' instead of cleaning up (7 such errors in test.test_iter alone),
	AND it left the scratch file behind -- that is the origin of the stray
	``@test'' that kept appearing in the working tree."

	^ self remove: path
%

category: 'Grail-File and Directory Operations'
method: os
rename: anOldPath _: aNewPath
	"os.rename(old, new) — rename a file or directory."

	| result msg oldPath newPath |
	oldPath := self ___fsPath___: anOldPath.
	newPath := self ___fsPath___: aNewPath.
	result := GsFile @env0:renameFileOnServer: oldPath to: newPath.
	result == nil ifTrue: [
		msg := ((oldPath @env0:printString) @env0:, ' to ') @env0:, (newPath @env0:printString).
		OSError ___signal___: ('Cannot rename: ' @env0:, msg)
	].
	^ None
%

category: 'Grail-File and Directory Operations'
method: os
listdir: path
	"os.listdir(path) — 1-arg fast path. Delegates to _listdir:kw:."

	^ self _listdir: { path } kw: nil
%

category: 'Grail-File and Directory Operations'
method: os
_listdir: positional kw: kwargs
	"os.listdir([path]) — list directory contents. 0-arg uses cwd."

	| actualPath dirContents result |
	actualPath := (positional @env0:size @env0:>= 1) ifTrue: [positional @env0:at: 1] ifFalse: [nil].
	actualPath == nil ifTrue: [actualPath := self getcwd].
	"listdir: routes its 1-arg fast path through here, so this one
	coercion covers both spellings."
	actualPath := self ___fsPath___: actualPath.
	"GsFile>>contentsOfDirectory: expands a PATTERN; it does not open a
	directory, so it answers something plausible for two paths CPython
	refuses outright, and neither answer looked like an error:

	  * a MISSING path -> an empty Array, so ``os.listdir('/nope')'' answered
	    [] where CPython raises FileNotFoundError.  os.walk inherits this
	    directly -- a walk of a missing tree yielded one empty triple instead
	    of nothing, and never called its onerror.
	  * a path that is a FILE -> an Array holding that file, so
	    ``os.listdir('a.txt')'' answered ['a.txt'] where CPython raises
	    NotADirectoryError.  That one is the more dangerous of the two: a
	    recursive walker reads it as a directory containing itself.

	So the check is on the path, before listing.  Errno text matches
	___statOrSignal___:isLstat:, which had to learn the same lesson about this
	API answering a non-error on failure.

	NOT a complete errno mapping: an unreadable directory still answers an
	empty listing rather than PermissionError, because the pattern expansion
	does not distinguish it.  That is unchanged behaviour, not new."
	dirContents := GsFile
		@env0:_contentsOfServerDirectory: actualPath
		expandPath: false
		utf8Results: false.
	"The primitive answers an Array of BARE NAMES on success and the real
	ERRNO on failure -- both of which the public contentsOfDirectory:onClient:
	throws away.  That wrapper expands the path as a shell PATTERN, so it
	answered a plausible non-error for two paths CPython refuses: [] for a
	missing one and [that file] for a file, the second being the dangerous one
	since a recursive walker reads it as a directory containing itself.  It
	also expanded ``$'', hiding any file whose name contains one.

	Going to the primitive answers all of that at once: real errnos (including
	EACCES, which the wrapper could not distinguish at all), names that survive
	a ``$'', and no per-entry path stripping to undo."
	(dirContents @env0:isKindOf: Array) ifFalse: [
		| errno |
		errno := (dirContents @env0:isKindOf: SmallInteger) ifTrue: [dirContents] ifFalse: [0].
		errno @env0:= 2 ifTrue: [
			FileNotFoundError ___signal___:
				('[Errno 2] No such file or directory: ' @env0:, (actualPath @env0:printString))].
		errno @env0:= 13 ifTrue: [
			PermissionError ___signal___:
				('[Errno 13] Permission denied: ' @env0:, (actualPath @env0:printString))].
		errno @env0:= 20 ifTrue: [
			NotADirectoryError ___signal___:
				('[Errno 20] Not a directory: ' @env0:, (actualPath @env0:printString))].
		OSError ___signal___:
			('[Errno ' @env0:, (errno @env0:printString) @env0:, '] Cannot list directory: '
				@env0:, (actualPath @env0:printString))
	].
	result := list ___new___.
	"The names arrive BARE from the primitive -- the public wrapper answered
	full paths, and the basename stripping that undid them is gone with it."
	dirContents @env0:do: [:each |
		| decoded |
		decoded := each.
		(each isKindOf: Utf8) ifTrue: [decoded := each @env0:decodeToUnicode].
		(each isKindOf: Utf16) ifTrue: [decoded := each @env0:decodeToUnicode].
		(each isKindOf: String) ifFalse: [decoded := each @env0:asUnicodeString].
		"CPython never reports the '.' / '..' entries; GsFile does.
		Leaving them in sends naive recursive walkers (shutil.rmtree,
		copytree) into 'dir/././…' infinite recursion."
		((decoded @env0:= '.') @env0:or: [decoded @env0:= '..']) ifFalse: [
			result append: decoded
		]
	].
	^ result
%

! ===============================================================================
! os.scandir — DirEntry and its iterator
! ===============================================================================

set compile_env: 0

category: 'Instance Creation'
classmethod: os_DirEntry
name: aName path: aPath
	"Fields are dynamic instVars named exactly as the Python attributes, so
	``entry.name'' reads the VALUE rather than a BoundMethod wrapping an
	accessor -- the same arrangement PyStatResult uses for its st_* fields."

	| inst |
	inst := self new.
	inst dynamicInstVarAt: #'name' put: aName.
	inst dynamicInstVarAt: #'path' put: aPath.
	^ inst
%

category: 'Grail-Python Attribute Hook'
classmethod: os_DirEntry
___pythonValueAttrs___
	"name and path are DATA; everything else about an entry is a method call,
	exactly as in CPython (``e.name'' but ``e.is_dir()'')."

	^ IdentitySet new add: #'name'; add: #'path'; yourself
%

set compile_env: 1

category: 'Grail-Filesystem'
method: os_DirEntry
name
	^ self @env0:dynamicInstVarAt: #'name'
%

category: 'Grail-Filesystem'
method: os_DirEntry
path
	^ self @env0:dynamicInstVarAt: #'path'
%

category: 'Grail-Filesystem'
method: os_DirEntry
__fspath__
	"DirEntry is path-like (PEP 519), so it can be passed straight to open()
	or any os function -- which is most of the point of scandir."

	^ self path
%

category: 'Grail-Filesystem'
method: os_DirEntry
__repr__
	"CPython renders <DirEntry 'name'> -- the NAME, not the path."

	^ '<DirEntry ' @env0:, ((((Python @env0:at: #builtins) instance) repr: self name) @env0:asString) @env0:, '>'
%

category: 'Grail-Filesystem'
method: os_DirEntry
is_dir
	"entry.is_dir() -- follow_symlinks defaults to TRUE, so a symlink to a
	directory answers true."

	^ (os instance) isdir: self path
%

category: 'Grail-Filesystem'
method: os_DirEntry
_is_dir: positional kw: kwargs
	"entry.is_dir(follow_symlinks=False) -- with following off, a symlink is
	never a directory, whatever it points at."

	| follow |
	follow := (os instance) ___scandirFollowArg___: positional kw: kwargs
		for: 'is_dir'.
	follow ifTrue: [^ self is_dir].
	((os instance) ___isLink___: self path) ifTrue: [^ false].
	^ (os instance) isdir: self path
%

category: 'Grail-Filesystem'
method: os_DirEntry
is_file
	"entry.is_file() -- follow_symlinks defaults to true."

	^ (os instance) isfile: self path
%

category: 'Grail-Filesystem'
method: os_DirEntry
_is_file: positional kw: kwargs
	"entry.is_file(follow_symlinks=False).  A symlink is not a regular file
	when following is off, even one pointing at a regular file."

	| follow |
	follow := (os instance) ___scandirFollowArg___: positional kw: kwargs
		for: 'is_file'.
	follow ifTrue: [^ self is_file].
	((os instance) ___isLink___: self path) ifTrue: [^ false].
	^ (os instance) isfile: self path
%

category: 'Grail-Filesystem'
method: os_DirEntry
is_symlink
	"entry.is_symlink() -- no follow_symlinks argument in CPython either;
	asking whether something IS a link cannot follow it."

	^ (os instance) ___isLink___: self path
%

category: 'Grail-Filesystem'
method: os_DirEntry
is_junction
	"Junctions are a Windows concept; Grail's os reports ``posix''."

	^ false
%

category: 'Grail-Filesystem'
method: os_DirEntry
stat
	"entry.stat() -- follow_symlinks defaults to true, so a symlink reports
	its TARGET's stat."

	^ (os instance) stat: self path
%

category: 'Grail-Filesystem'
method: os_DirEntry
_stat: positional kw: kwargs
	"entry.stat(follow_symlinks=False) -- lstat, so a symlink reports itself."

	| follow |
	follow := (os instance) ___scandirFollowArg___: positional kw: kwargs
		for: 'stat'.
	follow ifTrue: [^ self stat].
	^ (os instance) lstat: self path
%

category: 'Grail-Filesystem'
method: os_DirEntry
inode
	"entry.inode() -- the inode number, from lstat: CPython's does not follow
	the link either, so a symlink answers ITS inode, not its target's."

	^ ((os instance) lstat: self path) @env1:___pyAttrLoad___: #'st_ino'
%

set compile_env: 0

category: 'Instance Creation'
classmethod: os_ScandirIterator
onEntries: anOrderedCollection
	| inst |
	inst := self new.
	inst dynamicInstVarAt: #'___entries___' put: anOrderedCollection.
	inst dynamicInstVarAt: #'___index___' put: 1.
	^ inst
%

set compile_env: 1

category: 'Grail-Filesystem'
method: os_ScandirIterator
__iter__
	"Its own iterator, as every CPython iterator is."

	^ self
%

category: 'Grail-Filesystem'
method: os_ScandirIterator
__next__
	"Exhaustion LATCHES: close() empties the list and the index runs past the
	end, so a spent iterator stays spent."

	| entries index |
	entries := self @env0:dynamicInstVarAt: #'___entries___'.
	index := self @env0:dynamicInstVarAt: #'___index___'.
	(entries @env0:isNil @env0:or: [index @env0:> entries @env0:size])
		ifTrue: [StopIteration @env0:signal].
	self @env0:dynamicInstVarAt: #'___index___' put: index @env0:+ 1.
	^ entries @env0:at: index
%

category: 'Grail-Filesystem'
method: os_ScandirIterator
__enter__
	"``with os.scandir(p) as it:'' -- the spelling CPython's own library uses,
	and the reason this is a class rather than a generator."

	^ self
%

category: 'Grail-Filesystem'
method: os_ScandirIterator
__exit__: excType _: excValue _: excTb
	"Answer false so an exception inside the ``with'' still propagates."

	self close.
	^ false
%

category: 'Grail-Filesystem'
method: os_ScandirIterator
close
	"Release the entries.  CPython closes a live directory handle here;
	Grail's listing is already complete by construction (see the class
	comment), so this only drops the reference -- calling it twice, or never,
	is harmless either way."

	self @env0:dynamicInstVarAt: #'___entries___' put: nil.
	^ None
%

! ===============================================================================
! Directory tree walking
! ===============================================================================

category: 'Grail-File and Directory Operations'
method: os
___scandirFollowArg___: positional kw: kwargs for: aName
	"The follow_symlinks argument of DirEntry's is_dir / is_file / stat.
	KEYWORD-ONLY in CPython, so a positional one is a TypeError rather than
	quietly taken as the flag."

	positional @env0:isEmpty ifFalse: [
		TypeError ___signal___:
			(aName @env0:, '() takes no positional arguments')].
	((kwargs @env0:isNil) @env0:not and: [kwargs @env0:includesKey: 'follow_symlinks'])
		ifTrue: [^ (kwargs @env0:at: 'follow_symlinks') ___isTruthy___].
	^ true
%

category: 'Grail-File and Directory Operations'
method: os
_scandir: positional kw: kwargs
	"os.scandir(path='.') -- an iterator of DirEntry, one per directory entry.

	The entries are read EAGERLY here rather than block by block as CPython's
	does, because GsFile answers a whole directory listing in one call and
	there is no partial-read primitive under it.  What that costs is memory on
	a very large directory; what it does NOT cost is the interface, which is
	why this still answers an iterator object rather than a list -- ``with
	os.scandir(p) as it:'' is the spelling CPython's own library uses.

	Errors come from listdir, which raises FileNotFoundError for a missing
	path and NotADirectoryError for a file, so scandir inherits CPython's
	behaviour for both without restating it."

	| target names entries |
	target := (positional @env0:size @env0:>= 1)
		ifTrue: [positional @env0:at: 1]
		ifFalse: [
			((kwargs @env0:isNil) @env0:not and: [kwargs @env0:includesKey: 'path'])
				ifTrue: [kwargs @env0:at: 'path']
				ifFalse: ['.']].
	target := self ___fsPath___: target.
	names := self listdir: target.
	entries := OrderedCollection @env0:new.
	names @env0:do: [:name |
		entries @env0:addLast:
			(os_DirEntry
				@env0:name: name
				path: ((os_path instance) join: target _: name))].
	^ os_ScandirIterator @env0:onEntries: entries
%

category: 'Grail-File and Directory Operations'
method: os
scandir
	"os.scandir() -- 0-arg form, the current directory."

	^ self _scandir: { } kw: nil
%

category: 'Grail-File and Directory Operations'
method: os
scandir: aPath
	"os.scandir(path) -- 1-arg fast path."

	^ self _scandir: { aPath } kw: nil
%

! ===============================================================================
! Symbolic links
! ===============================================================================

category: 'Grail-File and Directory Operations'
method: os
___shellQuote___: aString
	"Wrap a path for the shell in SINGLE quotes, which quote everything except
	a single quote itself -- and that one is closed, escaped, and reopened.

	Needed because symlink/readlink have no GemStone primitive and so run a
	command (see ___runShell___:).  A path containing a space, a ``$'', or a
	``;'' would otherwise be re-parsed by the shell, and the last of those is
	arbitrary command execution rather than a wrong answer."

	| s out |
	s := (self ___fsPath___: aString) @env0:asString.
	out := WriteStream @env0:on: String @env0:new.
	out @env0:nextPut: $'.
	1 @env0:to: s @env0:size do: [:i |
		| c |
		c := s @env0:at: i.
		c @env0:= $'
			ifTrue: [out @env0:nextPutAll: '''\''''']
			ifFalse: [out @env0:nextPut: c]].
	out @env0:nextPut: $'.
	^ out @env0:contents
%

category: 'Grail-File and Directory Operations'
method: os
___runShell___: aCommand
	"Run aCommand on the server and answer its STDOUT.

	System>>performOnServer: does not report an exit status, so nothing here
	can branch on one -- every caller below checks the RESULTING FILESYSTEM
	STATE instead, which is the honest test anyway."

	^ System @env0:performOnServer: aCommand
%

category: 'Grail-File and Directory Operations'
method: os
symlink: src _: dst
	"os.symlink(src, dst) -- create dst as a symbolic link to src.

	src is NOT required to exist: a dangling symlink is legal in POSIX and in
	CPython, and shutil/test code creates them deliberately.

	Implemented by running ``ln -s'', because GemStone exposes no symlink
	primitive -- GsFile can TEST for a symbolic link but not make one.  The
	paths are shell-quoted (___shellQuote___:) and passed after ``--'', so a
	path containing a space or a ``;'' cannot be re-parsed as shell syntax.

	The two errors CPython raises are checked BEFORE the command, since the
	command reports no status: dst already existing is FileExistsError, and a
	missing parent directory is FileNotFoundError.  Anything else that goes
	wrong is caught after the fact by asking whether the link now exists."

	| dstPath parent |
	dstPath := self ___fsPath___: dst.
	"lstat, not exists: a DANGLING symlink already occupying dst is still an
	occupant, and exists() would follow it and answer false."
	"``== true'' on the exists probe too: it answers nil (not false) when the
	probe errors -- a dst under a plain file -- and nil as the or: argument is
	the same error 2085 the parent check below explains."
	((self ___isLink___: dstPath) @env0:or: [(GsFile @env0:existsOnServer: dstPath) == true])
		ifTrue: [
			FileExistsError ___signal___:
				('[Errno 17] File exists: ' @env0:, (dstPath @env0:printString))].
	parent := (os_path instance) dirname: dstPath.
	"``== true'' is not belt-and-braces: GsFile>>isServerDirectory: answers NIL
	for a path that does not exist -- which is exactly the case being tested
	here -- and nil reaching ifFalse: is an ImproperOperation, an uncatchable
	Smalltalk error where a FileNotFoundError was due."
	(parent @env0:isEmpty @env0:or: [(GsFile @env0:isServerDirectory: parent) == true])
		ifFalse: [
			FileNotFoundError ___signal___:
				('[Errno 2] No such file or directory: ' @env0:, (dstPath @env0:printString))].
	self ___runShell___: 'ln -s -- ' @env0:,
		(self ___shellQuote___: src) @env0:, ' ' @env0:,
		(self ___shellQuote___: dstPath).
	(self ___isLink___: dstPath) ifFalse: [
		OSError ___signal___:
			('Cannot create symbolic link: ' @env0:, (dstPath @env0:printString))].
	^ None
%

category: 'Grail-File and Directory Operations'
method: os
_symlink: positional kw: kwargs
	"os.symlink(src, dst, target_is_directory=False).

	target_is_directory is accepted and IGNORED, which is what CPython does on
	POSIX too -- it exists for Windows, where the two kinds of link differ."

	positional @env0:size @env0:< 2 ifTrue: [
		TypeError ___signal___:
			'symlink() missing required argument: ''dst'''].
	^ self symlink: (positional @env0:at: 1) _: (positional @env0:at: 2)
%

category: 'Grail-File and Directory Operations'
method: os
readlink: aPath
	"os.readlink(path) -- the path a symbolic link points at, VERBATIM: a
	relative target is answered relative, not resolved against the link's
	directory.  That is CPython's contract, and os.path.realpath is what
	resolves.

	Not a link is EINVAL, not ENOENT -- CPython distinguishes ``there is
	nothing there'' from ``there is something there but it is not a link'',
	and code branches on it."

	| path out |
	path := self ___fsPath___: aPath.
	((GsFile @env0:stat: path isLstat: true) @env0:isKindOf: GsFileStat)
		ifFalse: [
			FileNotFoundError ___signal___:
				('[Errno 2] No such file or directory: ' @env0:, (path @env0:printString))].
	(self ___isLink___: path) ifFalse: [
		OSError ___signal___:
			('[Errno 22] Invalid argument: ' @env0:, (path @env0:printString))].
	out := self ___runShell___: 'readlink -- ' @env0:, (self ___shellQuote___: path).
	"readlink(1) terminates its answer with a newline; the syscall does not."
	[out @env0:size @env0:> 0
		and: [(out @env0:at: out @env0:size) @env0:= (Character @env0:lf)]]
		@env0:whileTrue: [out := out @env0:copyFrom: 1 to: out @env0:size @env0:- 1].
	^ out @env0:asUnicodeString
%

category: 'Grail-File and Directory Operations'
method: os
___statOrNil___: aPath lstat: isLstat
	"The GsFileStat for aPath, or NIL if it cannot be stat'd.  The shared
	primitive under exists / isdir / isfile / islink -- the PREDICATES, which
	answer a Boolean and never raise, so a failure is simply ``no''.
	___statOrSignal___:isLstat: is the raising sibling, for os.stat itself.

	Two GsFile traps in one line.  stat:isLstat: answers a SmallInteger ERRNO
	on failure rather than nil, so the test has to be on the SUCCESS shape.
	And it is the only file primitive that does NOT expand ``$'' in the path,
	which is why every predicate was rebuilt on it: GsFile>>existsOnServer:
	does expand, so ``exists('dir/a$b')'' answered about ``dir/a'' -- true, if
	such a file happened to be there."

	| result |
	result := GsFile @env0:stat: aPath isLstat: isLstat.
	(result @env0:isKindOf: GsFileStat) ifTrue: [^ result].
	^ nil
%

category: 'Grail-File and Directory Operations'
method: os
___isLink___: aPath
	"True iff aPath names a symbolic link.  The primitive behind
	os.path.islink; not exposed on ``os'' itself, which has no islink in
	CPython.

	os.path.islink answers FALSE for anything it cannot stat -- a missing
	path, an unreadable parent -- rather than raising, so a failed lstat is
	not an error here.  GsFile>>stat:isLstat: answers a SmallInteger errno on
	failure rather than nil, so the test is on the SUCCESS shape (see
	___statOrSignal___:isLstat:, which was written for the same trap).

	lstat, never stat: stat follows the link and would report the TARGET's
	type, so every symlink would answer false."

	| st |
	st := self ___statOrNil___: (self ___fsPath___: aPath) lstat: true.
	st @env0:isNil ifTrue: [^ false].
	"S_IFMT / S_IFLNK -- the file-type field of st_mode."
	^ (st @env0:mode @env0:bitAnd: 16rF000) @env0:= 16rA000
%

category: 'Grail-File and Directory Operations'
method: os
___walkArgAt___: positional at: anIndex kw: kwargs name: aName default: aDefault
	"One os.walk() optional argument, positionally or by keyword.  Shared by
	the four so the precedence -- positional, then keyword, then default --
	is written once."

	(positional @env0:size @env0:>= anIndex) ifTrue: [^ positional @env0:at: anIndex].
	((kwargs @env0:isNil) @env0:not and: [kwargs @env0:includesKey: aName])
		ifTrue: [^ kwargs @env0:at: aName].
	^ aDefault
%

category: 'Grail-File and Directory Operations'
method: os
_walk: positional kw: kwargs
	"os.walk(top, topdown=True, onerror=None, followlinks=False) -- the
	directory-tree generator.

	Yields (dirpath, dirnames, filenames) for every directory under top,
	top itself included.

	A REAL GENERATOR, not a materialised list, because the laziness is part
	of the documented contract: with topdown true the caller may prune the
	walk by mutating ``dirnames'' IN PLACE between yields (``dirs.remove(
	'__pycache__')''), and a list built up front would have finished
	recursing before the caller ever saw it.  PythonGenerator takes a 1-arg
	Smalltalk block and runs it as a coroutine, so the block below suspends
	at each ___yield___: exactly where CPython's ``yield'' does.

	Structure follows CPython's own iterative implementation rather than
	recursing: ONE generator with an explicit stack, whose entries are either
	a path still to visit or -- for the bottom-up case -- an already-computed
	triple waiting to be yielded after its subdirectories.  Recursion would
	have meant a nested generator, and so a forked GsProcess, per directory."

	| top topdown onerror followlinks |
	positional @env0:size @env0:< 1 ifTrue: [
		TypeError ___signal___:
			'walk() missing 1 required positional argument: ''top'''].
	top := positional @env0:at: 1.
	topdown := self ___walkArgAt___: positional at: 2 kw: kwargs
		name: 'topdown' default: true.
	onerror := self ___walkArgAt___: positional at: 3 kw: kwargs
		name: 'onerror' default: nil.
	followlinks := self ___walkArgAt___: positional at: 4 kw: kwargs
		name: 'followlinks' default: false.
	^ self ___walk___: top
		topdown: topdown ___isTruthy___
		onerror: onerror
		followlinks: followlinks ___isTruthy___
%

category: 'Grail-File and Directory Operations'
method: os
walk: aTop
	"os.walk(top) -- 1-arg fast path.  Delegates to _walk:kw:."

	^ self _walk: { aTop } kw: nil
%

category: 'Grail-File and Directory Operations'
method: os
walk: aTop _: topdown
	"os.walk(top, topdown) -- 2-arg fast path.  Delegates to _walk:kw:."

	^ self _walk: { aTop. topdown } kw: nil
%

category: 'Grail-File and Directory Operations'
method: os
___walk___: aTop topdown: topdown onerror: onerror followlinks: followlinks
	"The generator behind os.walk -- see _walk:kw: for the argument handling
	and for why this is a generator at all.  topdown/followlinks arrive as
	Smalltalk Booleans, already truth-tested."

	| pathMod reportError |
	pathMod := os_path instance.
	"``onerror'' is called with the OSError and may re-raise to abort the
	walk; CPython's default is to swallow the error and skip the directory,
	which is why an unreadable directory in a thousand-directory tree does
	not blow up the walk.  None and an omitted argument mean the same here."
	reportError := [:ex |
		((onerror @env0:isNil) @env0:not and: [onerror @env0:~~ None])
			ifTrue: [onerror @env1:___pyCallValue___: { ex } kw: nil]].
	^ PythonGenerator withBlock: [:gen |
		| stack |
		stack := OrderedCollection @env0:new.
		stack @env0:addLast: (self ___fsPath___: aTop).
		[stack @env0:isEmpty] @env0:whileFalse: [
			| top dirs nondirs walkDirs names |
			top := stack @env0:removeLast.
			"A deferred BOTTOM-UP triple, pushed below once its subdirectories
			were queued: nothing left to do but hand it over."
			(top @env0:isKindOf: Array)
				ifTrue: [
					gen ___yield___: (tuple @env0:withAll: top)]
				ifFalse: [
					dirs := list ___new___.
					nondirs := list ___new___.
					walkDirs := OrderedCollection @env0:new.
					names := [self listdir: top]
						@env0:on: OSError
						do: [:ex | reportError @env0:value: ex. ex @env0:return: nil].
					"nil means the listing failed and onerror (if any) has seen
					it.  CPython does not yield an unreadable directory at all,
					so this is a skip rather than an empty triple."
					names @env0:isNil ifFalse: [
						names @env0:do: [:name |
							| full isDir |
							full := pathMod join: top _: name.
							"is_dir() FOLLOWS symlinks, so a symlink to a
							directory is reported in dirnames -- what governs
							whether it is DESCENDED INTO is followlinks, below.
							An OSError here counts as ``not a directory'', which
							is what os.path.isdir does."
							isDir := [self isdir: full]
								@env0:on: OSError
								do: [:ex | ex @env0:return: false].
							isDir
								ifTrue: [dirs append: name]
								ifFalse: [nondirs append: name].
							(isDir @env0:and: [topdown @env0:not]) ifTrue: [
								"Bottom-up: the descend list is fixed NOW, before
								anything is yielded, because by the time the
								caller sees dirnames the subdirectories have
								already been walked -- mutating it then has no
								effect, which is exactly what CPython documents."
								(followlinks @env0:or: [(self ___isLink___: full) @env0:not])
									ifTrue: [walkDirs @env0:addLast: full]]].
						topdown
							ifTrue: [
								gen ___yield___: (tuple @env0:withAll: { top. dirs. nondirs }).
								"dirs is READ BACK AFTER the yield, and that is
								the whole pruning contract: the caller may have
								removed entries to stop the walk descending into
								them.  It is the same object it was handed, so
								the mutation is already here.
								islink is re-tested here rather than cached
								during the scan above for the same reason CPython
								gives (bpo-23605): the caller may have replaced a
								directory entry during the yield."
								dirs @env0:reverseDo: [:dirname |
									| newPath |
									newPath := pathMod join: top _: dirname.
									(followlinks @env0:or: [(self ___isLink___: newPath) @env0:not])
										ifTrue: [stack @env0:addLast: newPath]]]
							ifFalse: [
								"Push the triple FIRST so it is popped LAST --
								after every subdirectory queued above it."
								stack @env0:addLast: { top. dirs. nondirs }.
								walkDirs @env0:reverseDo: [:newPath |
									stack @env0:addLast: newPath]]]]].
		nil]
%

! ===============================================================================
! Fast-path callables — file queries
! ===============================================================================

category: 'Grail-File and Directory Operations'
method: os
exists: aPath
	"os.path.exists(path) exposed as os.exists(path).  FOLLOWS symlinks, so a
	dangling link does not exist -- which is CPython's answer too.

	Asks STAT rather than GsFile>>existsOnServer:, because that one expands
	``$'' in the path: ``existsOnServer: 'dir/a$b''' answers for ``dir/a''.
	With a file named ``a'' beside it that is not a miss but a WRONG ANSWER
	about a different file, and everything built on it -- isdir, isfile,
	remove's presence check -- inherited it.  GsFile>>stat:isLstat: does no
	expansion, so it is the primitive every one of these now rests on.

	The ``$'' problem is not fully solved here: the primitives that OPEN or
	REMOVE a file still expand, and there is no non-expanding variant of them
	to call.  What changes is that the QUESTIONS now answer about the file
	that was named."

	^ (self ___statOrNil___: (self ___fsPath___: aPath) lstat: false) @env0:notNil
%

category: 'Grail-File and Directory Operations'
method: os
isdir: aPath
	"os.path.isdir(path) exposed as os.isdir(path).  FOLLOWS symlinks, so a
	link to a directory is a directory -- CPython's answer, and what makes
	os.walk report such a link in dirnames.

	Reads the file-type field of stat rather than asking
	GsFile>>isServerDirectory:, for the reason exists: gives (that one expands
	``$'' in the path) and for one more: isServerDirectory: answers NIL for a
	path that does not exist, so its result could not be used as a Boolean
	without a preceding existence check that had the same expansion flaw."

	| st |
	st := self ___statOrNil___: (self ___fsPath___: aPath) lstat: false.
	st @env0:isNil ifTrue: [^ false].
	^ (st @env0:mode @env0:bitAnd: 16rF000) @env0:= 16r4000
%

category: 'Grail-File and Directory Operations'
method: os
isfile: aPath
	"os.path.isfile(path) exposed as os.isfile(path).  A REGULAR file, and
	nothing else: CPython answers false for a directory, a socket, a fifo or a
	device, where ``not a directory'' would answer true for all four.

	Follows symlinks, and reads the file-type field for the reasons isdir:
	gives."

	| st |
	st := self ___statOrNil___: (self ___fsPath___: aPath) lstat: false.
	st @env0:isNil ifTrue: [^ false].
	^ (st @env0:mode @env0:bitAnd: 16rF000) @env0:= 16r8000
%

category: 'Grail-Filesystem'
method: os
___statOrSignal___: path isLstat: isLstat
	"GsFile>>stat:isLstat: answers a GsFileStat on success but a SmallInteger
	ERRNO on failure -- never nil, which is what the callers here used to test
	for.  So a failing stat quietly answered an integer, and the first
	``st_size'' / ``st_mtime'' read on it blew up as an UNCATCHABLE Smalltalk
	MessageNotUnderstood (#mode sent to a SmallInteger) rather than the OSError
	CPython raises.  That is why linecache.updatecache's ``except OSError''
	never fired for a missing file: it never got an exception at all.

	Test on the SUCCESS shape, so any other unexpected answer also becomes a
	Python-level error instead of a stray message send.  Map the errnos that
	have dedicated CPython subclasses; ``except OSError'' catches all of them."

	| result errno |
	result := GsFile @env0:stat: path isLstat: isLstat.
	(result @env0:isKindOf: GsFileStat) ifTrue: [^ result].
	errno := (result @env0:isKindOf: SmallInteger) ifTrue: [result] ifFalse: [0].
	errno == 2 ifTrue: [
		FileNotFoundError ___signal___:
			('[Errno 2] No such file or directory: ' @env0:, (path @env0:printString))].
	errno == 13 ifTrue: [
		PermissionError ___signal___:
			('[Errno 13] Permission denied: ' @env0:, (path @env0:printString))].
	errno == 20 ifTrue: [
		NotADirectoryError ___signal___:
			('[Errno 20] Not a directory: ' @env0:, (path @env0:printString))].
	^ OSError ___signal___:
		('[Errno ' @env0:, (errno @env0:printString) @env0:, '] Cannot stat: '
			@env0:, (path @env0:printString))
%

category: 'Grail-File and Directory Operations'
method: os
stat: aPath
	"os.stat(path) — get file status."

	| statResult path |
	path := self ___fsPath___: aPath.
	statResult := self ___statOrSignal___: path isLstat: false.
	"Answer CPython's os.stat_result, not the raw GsFileStat: the fields are the
	same but Python code reads them as ``st_size'' / ``st_mtime'' (linecache does
	so on every source lookup, django's session and file-storage backends too),
	and a GsFileStat only answers GemStone names.  See PyStatResult."
	^ PyStatResult @env0:on: statResult
%

category: 'Grail-File and Directory Operations'
method: os
getmtime: aPath
	"os.path.getmtime(path) backing — modification time in seconds since the
	epoch.  GsFileStat exposes whole-second resolution (mtimeUtcSeconds), so
	this is coarser than CPython's float on high-resolution filesystems; it is
	enough for the auto-reloader (which only needs to notice that an edit
	happened)."

	| st path |
	path := self ___fsPath___: aPath.
	st := self ___statOrSignal___: path @env0:asString isLstat: false.
	^ st @env0:mtimeUtcSeconds
%

category: 'Grail-File and Directory Operations'
method: os
lstat: aPath
	"os.lstat(path) — like stat but does not follow symlinks."

	| statResult path |
	path := self ___fsPath___: aPath.
	statResult := self ___statOrSignal___: path isLstat: true.
	^ PyStatResult @env0:on: statResult
%

! ===============================================================================
! File times — os.utime
! ===============================================================================

category: 'Grail-File and Directory Operations'
method: os
___zeroPad___: anInteger width: aWidth
	"anInteger as a decimal string, left-padded with zeroes to aWidth.  Only
	ever called on the non-negative civil-calendar fields built by
	___isoUtcFromEpochSeconds___, so there is no sign to place."

	| s |
	s := anInteger @env0:printString.
	[s @env0:size @env0:< aWidth] @env0:whileTrue: [s := '0' @env0:, s].
	^ s
%

category: 'Grail-File and Directory Operations'
method: os
___isoUtcFromEpochSeconds___: secs
	"``YYYY-MM-DDThh:mm:ssZ'' for whole Unix-epoch seconds -- the one spelling
	of an absolute time that BOTH touch(1) implementations read as UTC.

	os.utime has to run touch(1), because GemStone exposes no utimes(2), and
	the OBVIOUS spelling is wrong: ``touch -t CCYYMMDDhhmm.ss'' is defined in
	LOCAL time.  Measured here, ``-t 200102030405.06'' stamped 981201906 where
	that civil time in UTC is 981173106 -- eight hours out, and the size of the
	error varies with the gem's zone and with DST.  ``-d'' with a trailing
	``Z'' is UTC on BSD touch (macOS) and on GNU touch (Linux, and so CI).

	The conversion is Howard Hinnant's civil-from-days in plain integers rather
	than through Date/DateTime, for the reason time.gs gives at
	___unixEpochDays___: DateTime>>asSeconds bakes in the gem's STANDARD UTC
	offset, so anything derived from it is a whole hour out across a DST
	boundary.  GemStone's // and \\ both floor, so the same expressions are
	correct for a NEGATIVE (pre-1970) timestamp -- which os.utime is allowed to
	be given, and which a truncating division would render as the wrong day.

	Signals OverflowError outside years 1..9999, where the four-digit year
	field cannot render the value.  CPython raises OverflowError for an
	out-of-range timestamp too (``timestamp out of range for platform
	time_t''), so the class of error matches even though the exact boundary
	does not."

	| days rem z era doe yoe y doy mp d m |
	days := secs @env0:// 86400.
	rem := secs @env0:- (days @env0:* 86400).
	z := days @env0:+ 719468.
	era := z @env0:// 146097.
	doe := z @env0:- (era @env0:* 146097).
	yoe := (doe @env0:- (doe @env0:// 1460) @env0:+ (doe @env0:// 36524)
		@env0:- (doe @env0:// 146096)) @env0:// 365.
	y := yoe @env0:+ (era @env0:* 400).
	doy := doe @env0:- ((365 @env0:* yoe) @env0:+ (yoe @env0:// 4) @env0:- (yoe @env0:// 100)).
	mp := ((5 @env0:* doy) @env0:+ 2) @env0:// 153.
	d := doy @env0:- (((153 @env0:* mp) @env0:+ 2) @env0:// 5) @env0:+ 1.
	m := mp @env0:< 10 ifTrue: [mp @env0:+ 3] ifFalse: [mp @env0:- 9].
	m @env0:<= 2 ifTrue: [y := y @env0:+ 1].
	(y @env0:< 1 @env0:or: [y @env0:> 9999]) ifTrue: [
		OverflowError ___signal___: 'timestamp out of range for platform time_t'].
	^ (self ___zeroPad___: y width: 4) @env0:,
		'-' @env0:, (self ___zeroPad___: m width: 2) @env0:,
		'-' @env0:, (self ___zeroPad___: d width: 2) @env0:,
		'T' @env0:, (self ___zeroPad___: (rem @env0:// 3600) width: 2) @env0:,
		':' @env0:, (self ___zeroPad___: (rem @env0:\\ 3600 @env0:// 60) width: 2) @env0:,
		':' @env0:, (self ___zeroPad___: (rem @env0:\\ 60) width: 2) @env0:, 'Z'
%

category: 'Grail-File and Directory Operations'
method: os
___utimePair___: aValue name: aName integersOnly: intsOnly
	"Validate the (atime, mtime) pair os.utime was handed, with CPython's
	messages, and answer it.

	CPython accepts a TUPLE only -- a LIST of two ints is a TypeError, because
	posixmodule.c tests PyTuple_Check -- so this does too.  Accepting a list
	would be the friendlier answer and the wrong one: code written against it
	would then fail under CPython, which is the direction of breakage that
	costs the most to find."

	| shape |
	shape := 'utime: ''' @env0:, aName @env0:, ''' must be ' @env0:,
		(intsOnly
			ifTrue: ['a tuple of two ints']
			ifFalse: ['either a tuple of two ints or None']).
	((aValue @env0:isKindOf: tuple) @env0:and: [aValue @env0:size @env0:= 2])
		ifFalse: [TypeError ___signal___: shape].
	aValue @env0:do: [:each |
		intsOnly
			ifTrue: [
				(each @env0:isKindOf: Integer) ifFalse: [
					TypeError ___signal___: ('''' @env0:,
						(bytes ___pyTypeNameOf___: each) @env0:,
						''' object cannot be interpreted as an integer')]]
			ifFalse: [
				(each @env0:isKindOf: Number) ifFalse: [
					TypeError ___signal___: ('argument must be int or float, not '
						@env0:, (bytes ___pyTypeNameOf___: each))]]].
	^ aValue
%

category: 'Grail-File and Directory Operations'
method: os
___applyUtime___: aPath atime: at mtime: mt follow: followSymlinks
	"Set aPath's access and modification times to the whole Unix-epoch seconds
	at / mt, and answer None.  The one place that actually touches the clock;
	every os.utime spelling above funnels here once its arguments are settled.

	Runs touch(1) -- see ___isoUtcFromEpochSeconds___ for why -d and not -t.
	``-a'' and ``-m'' set the two times independently, which is what CPython's
	(atime, mtime) pair means; when they are equal one bare touch sets both,
	which halves the process spawns on kaggle's per-chunk restamping loop.
	``-h'' is the follow_symlinks=False case: both BSD and GNU touch spell
	``act on the link itself'' that way.

	The path is single-quoted by ___shellQuote___: and passed after ``--'', so
	a downloaded filename holding a space, a quote or a ``;'' is a filename and
	not shell syntax.  The formatted timestamp is quoted too -- it is generated
	here and cannot be hostile, but an unquoted argument next to a quoted one
	invites the next edit to get it wrong.

	System>>performOnServer: reports no exit status, so SUCCESS IS MEASURED,
	not assumed: the file is re-stat'd afterwards and the times read back must
	be the ones asked for.  That is the whole point of the method.  A no-op
	implementation -- which is what os.utime nearly shipped as -- passes every
	``did not raise'' test and fails this one.  The re-stat matches the way
	touch acted: lstat when -h was used, stat when it was not."

	| path st q base atIso mtIso |
	path := self ___fsPath___: aPath.
	"Format BEFORE the existence check so an out-of-range timestamp is an
	OverflowError rather than a FileNotFoundError, which is the order CPython
	reports them in: argument conversion, then the syscall."
	atIso := self ___isoUtcFromEpochSeconds___: at.
	mtIso := self ___isoUtcFromEpochSeconds___: mt.
	st := self ___statOrNil___: path lstat: followSymlinks @env0:not.
	st @env0:isNil ifTrue: [
		FileNotFoundError ___signal___:
			('[Errno 2] No such file or directory: ' @env0:, (path @env0:printString))].
	q := self ___shellQuote___: path.
	base := followSymlinks ifTrue: ['touch '] ifFalse: ['touch -h '].
	at @env0:= mt
		ifTrue: [
			self ___runShell___: base @env0:, '-d ' @env0:,
				(self ___shellQuote___: mtIso) @env0:, ' -- ' @env0:, q]
		ifFalse: [
			self ___runShell___: base @env0:, '-a -d ' @env0:,
				(self ___shellQuote___: atIso) @env0:, ' -- ' @env0:, q.
			self ___runShell___: base @env0:, '-m -d ' @env0:,
				(self ___shellQuote___: mtIso) @env0:, ' -- ' @env0:, q].
	st := self ___statOrNil___: path lstat: followSymlinks @env0:not.
	(st @env0:notNil @env0:and: [
		(st @env0:mtimeUtcSeconds @env0:= mt) @env0:and: [
			st @env0:atimeUtcSeconds @env0:= at]])
		ifFalse: [
			OSError ___signal___: ('[Errno 1] Operation not permitted: '
				@env0:, (path @env0:printString))].
	^ None
%

category: 'Grail-File and Directory Operations'
method: os
_utime: positional kw: kwargs
	"os.utime(path, times=None, *, ns=..., dir_fd=None, follow_symlinks=True).

	WHAT A CALLER CAN RELY ON.  The times are REALLY SET -- ___applyUtime___
	reads them back and raises if they did not take -- to WHOLE SECONDS.  Any
	sub-second part of the argument is floored away, matching os.stat here,
	which already answers an int st_mtime where CPython answers a float
	(GsFileStat exposes whole seconds only).  So a round trip through
	os.utime + os.stat agrees with CPython on math.floor(st_mtime) and not on
	st_mtime itself.

	times=None (or omitted) means NOW, and ``now'' is read from the gem's
	clock and then set explicitly rather than left to touch's own default, so
	that the read-back check above has something to compare against.

	ns=(atime_ns, mtime_ns) is accepted and floored to seconds by the same
	rule; it is not rejected, because rejecting it would push callers onto
	times= for no gain when the truncation is the same either way.  Giving
	both times= and ns= is CPython's ValueError.

	follow_symlinks=False is IMPLEMENTED (touch -h).  dir_fd is not, and says
	so with NotImplementedError rather than accepting and ignoring it: on
	Linux and macOS CPython honours dir_fd, so silently resolving the path
	against the wrong directory would be a wrong answer, not a missing
	feature.  os.utime is deliberately NOT added to os.supports_follow_symlinks
	-- membership there is tested by object identity, and an attribute load of
	a module method here builds a fresh BoundMethod each time, so the set could
	only ever answer false.

	DEVIATION: a failure to apply the times -- most often no write permission,
	which CPython reports as PermissionError -- surfaces as a plain OSError,
	because performOnServer: hands back no exit status to tell the cases apart.
	``except OSError'' catches both spellings; ``except PermissionError'' would
	not."

	| n path times ns timesGiven nsGiven follow at mt pair |
	n := positional @env0:size.
	n @env0:< 1 ifTrue: [
		TypeError ___signal___: 'utime() missing required argument ''path'' (pos 1)'].
	n @env0:> 2 ifTrue: [
		TypeError ___signal___: ('utime() takes at most 2 positional arguments ('
			@env0:, (n @env0:printString) @env0:, ' given)')].
	path := positional @env0:at: 1.
	times := None.
	timesGiven := false.
	nsGiven := false.
	follow := true.
	n @env0:= 2 ifTrue: [
		times := positional @env0:at: 2.
		timesGiven := true].
	(kwargs @env0:isNil @env0:or: [kwargs @env0:isEmpty]) ifFalse: [
		kwargs @env0:keysDo: [:k | | key |
			key := k @env0:asString.
			(#( 'times' 'ns' 'dir_fd' 'follow_symlinks' ) @env0:includes: key)
				ifFalse: [
					TypeError ___signal___:
						('utime() got an unexpected keyword argument '''
							@env0:, key @env0:, '''')].
			key @env0:= 'times' ifTrue: [
				timesGiven ifTrue: [
					TypeError ___signal___:
						'utime() got multiple values for argument ''times'''].
				times := kwargs @env0:at: k.
				timesGiven := true].
			key @env0:= 'ns' ifTrue: [
				ns := kwargs @env0:at: k.
				nsGiven := true].
			key @env0:= 'dir_fd' ifTrue: [
				(kwargs @env0:at: k) == None ifFalse: [
					NotImplementedError ___signal___:
						'utime: dir_fd unavailable on this platform']].
			key @env0:= 'follow_symlinks' ifTrue: [
				follow := (kwargs @env0:at: k) ___isTruthy___]]].
	(nsGiven @env0:and: [timesGiven @env0:and: [times ~~ None]]) ifTrue: [
		ValueError ___signal___:
			'utime: you may specify either ''times'' or ''ns'' but not both'].
	nsGiven
		ifTrue: [
			pair := self ___utimePair___: ns name: 'ns' integersOnly: true.
			at := (pair @env0:at: 1) @env0:// 1000000000.
			mt := (pair @env0:at: 2) @env0:// 1000000000]
		ifFalse: [
			(timesGiven @env0:and: [times ~~ None])
				ifTrue: [
					pair := self ___utimePair___: times name: 'times' integersOnly: false.
					at := (pair @env0:at: 1) @env0:floor.
					mt := (pair @env0:at: 2) @env0:floor]
				ifFalse: [
					at := System @env0:timeGmt.
					mt := at]].
	^ self ___applyUtime___: path atime: at mtime: mt follow: follow
%

category: 'Grail-File and Directory Operations'
method: os
utime: aPath
	"os.utime(path) -- 1-arg fast path: stamp both times with NOW.
	Delegates to _utime:kw: so there is one set of semantics."

	^ self _utime: { aPath } kw: nil
%

category: 'Grail-File and Directory Operations'
method: os
utime: aPath _: times
	"os.utime(path, times) -- 2-arg fast path.  Delegates to _utime:kw:."

	^ self _utime: { aPath . times } kw: nil
%

! ===============================================================================
! Fast-path callables — environment variables
! ===============================================================================

category: 'Grail-Environment Variables'
method: os
getenv: name
	"os.getenv(name) — get environment variable, return None if absent."

	^ self getenv: name _: None
%

category: 'Grail-Environment Variables'
method: os
getenv: name _: default
	"os.getenv(name, default) — get environment variable with default."

	| result |
	result := System @env0:gemEnvironmentVariable: name.
	result == nil ifTrue: [^ default].
	^ result
%

category: 'Grail-Environment Variables'
method: os
putenv: name _: value
	"os.putenv(name, value) — set environment variable."

	System @env0:gemEnvironmentVariable: name put: value.
	^ None
%

category: 'Grail-Environment Variables'
method: os
unsetenv: name
	"os.unsetenv(name) — remove an environment variable.  GemStone has no
	true ``remove'' for a gem environment variable, so clear it to nil
	(falling back to an empty string if the platform rejects nil).  numpy's
	_core init relies on this to undo a transient OPENBLAS_MAIN_FREE putenv."

	[ System @env0:gemEnvironmentVariable: name put: nil ]
		@env0:on: AbstractException
		do: [:ex | System @env0:gemEnvironmentVariable: name put: '' ].
	^ None
%

! ===============================================================================
! Fast-path callables — process management
! ===============================================================================

category: 'Grail-Process Management'
method: os
system: command
	"os.system(command) — execute command in a subshell."

	^ System @env0:performOnServer: command
%

! ===============================================================================
! Module introspection
! ===============================================================================

category: 'Grail-Queries'
method: os
_get_exports_list: aModule
	"CPython's os._get_exports_list(module): the module's ``__all__'' when it
	has one, otherwise every public name in it.

	    def _get_exports_list(module):
	        try:    return list(module.__all__)
	        except AttributeError:
	            return [n for n in dir(module) if n[0] != '_']

	Obscure, but load-bearing: CPython's socket.py calls it at import time
	(``__all__.extend(os._get_exports_list(_socket))'') to republish the
	primitive layer's names, so socket.py cannot even be imported without it."

	| all out |
	"AttributeError here is Python's, not a Smalltalk Error, so it must be
	named explicitly -- ``on: Error'' does not catch it and the miss escapes
	as the very AttributeError this is meant to absorb."
	all := [aModule ___pyAttrLoad___: #'__all__']
		@env0:on: AttributeError do: [:e | e @env0:return: nil].
	all @env0:notNil ifTrue: [^ all].
	out := OrderedCollection @env0:new.
	(aModule @env0:keys) @env0:do: [:k | | s |
		s := k @env0:asString.
		(s @env0:isEmpty @env0:or: [(s @env0:at: 1) @env0:== $_]) ifFalse: [
			out @env0:add: s]].
	^ out @env0:asArray
%

set compile_env: 0

! ===============================================================================
! os_Environ — env-0 dictionary protocol
!
! Internal SMALLTALK callers reach os.environ through the KeyValueDictionary
! protocol rather than the Python one: ``time >> ___tzEnvironmentSpec___''
! reads TZ with ``env at: 'TZ' otherwise: nil''.  That worked while environ was
! a literal KeyValueDictionary and silently stopped working when it became a
! view -- the DNU was swallowed by the caller's on:do:, so TZ simply read as
! unset and time.tzset() lost the zone.  These keep that contract, now with the
! read-through behind it.
! ===============================================================================

category: 'Grail-Env0 Dictionary Protocol'
method: os_Environ
at: key otherwise: default
	| v |
	v := System gemEnvironmentVariable: (key asString).
	v == nil ifTrue: [^ default].
	self @env1:___note___: key.
	^ v
%

category: 'Grail-Env0 Dictionary Protocol'
method: os_Environ
at: key ifAbsent: aBlock
	| v |
	v := System gemEnvironmentVariable: (key asString).
	v == nil ifTrue: [^ aBlock value].
	self @env1:___note___: key.
	^ v
%

category: 'Grail-Env0 Dictionary Protocol'
method: os_Environ
at: key
	| v |
	v := System gemEnvironmentVariable: (key asString).
	v == nil ifTrue: [^ self error: 'key not found: ' , key asString].
	self @env1:___note___: key.
	^ v
%

category: 'Grail-Env0 Dictionary Protocol'
method: os_Environ
at: key put: value
	System gemEnvironmentVariable: (key asString) put: (value asString).
	self @env1:___note___: key.
	^ value
%

category: 'Grail-Env0 Dictionary Protocol'
method: os_Environ
includesKey: key
	^ (System gemEnvironmentVariable: (key asString)) ~~ nil
%
