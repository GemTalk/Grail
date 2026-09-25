! ------------------- Superclass check
run
NativeModule ifNil: [self error: 'NativeModule is not defined. Check file ordering.'].
%

! ------- os class (Python 'os' module)
expectvalue /Class
doit
NativeModule subclass: 'os'
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
	"open(2) flag constants -- THIS platform's numbers, because os.open hands
	them straight to libc.  Only the access modes agree across platforms: the
	set used to be Darwin's alone, which on Linux made O_CREAT (512) mean
	O_TRUNC, and O_TRUNC (1024) mean O_APPEND."
	self @env0:at: #O_RDONLY put: 0.
	self @env0:at: #O_WRONLY put: 1.
	self @env0:at: #O_RDWR put: 2.
	self @env0:class ___openFlags @env0:keysAndValuesDo: [:name :value |
		self @env0:at: name put: value].
	"lseek(2) whence values, spelled as CPython's os and io spell them.  CPython's
	own zipfile seeks with os.SEEK_SET / SEEK_CUR / SEEK_END, so without them the
	real module could not even be imported."
	self @env0:at: #SEEK_SET put: 0.
	self @env0:at: #SEEK_CUR put: 1.
	self @env0:at: #SEEK_END put: 2.
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
	"``os._walk_symlinks_as_files'' is a bare sentinel OBJECT in CPython, and
	is compared by identity.  Path.walk() passes it as os.walk's followlinks
	for its own follow_symlinks=False, and it asks for a third behaviour that
	neither Boolean gives: a symlink to a directory is reported as a FILE and
	never descended into.  Private by name, and still part of the contract --
	pathlib is the caller."
	self @env0:at: #'_walk_symlinks_as_files' put: (object ___new___).
	self @env0:at: #path put: (os_path instance).
	self @env0:at: #PathLike put: os_PathLike.
	"``os.DirEntry'' is a real module attribute in CPython -- code type-tests
	scandir results against it -- even though nothing can construct one."
	self @env0:at: #DirEntry put: os_DirEntry.
	"``os.stat_result'' is the TYPE os.stat() answers.  CPython's pathlib reads
	it in a class body -- ``hasattr(os.stat_result, 'st_flags')'' decides whether
	_PosixPathInfo gets _bsd_flags -- so without it pathlib failed at import.
	PyStatResult has no st_flags, which is Linux CPython's answer too."
	self @env0:at: #stat_result put: PyStatResult.
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
		or: [self ___isRegistered___: instance @env0:class]
%

category: 'Grail-ABC'
classmethod: os_PathLike
register: aClass
	"os.PathLike.register(cls) -- ABCMeta's virtual-subclass registration.
	CPython's pathlib calls it at import, ``os.PathLike.register(PurePath)'', so
	without it pathlib could not be imported at all.

	For that call it changes nothing: PurePath defines __fspath__, which the
	structural check above already accepts.  It matters for a class registered
	WITHOUT __fspath__, which CPython then treats as PathLike and so does this.
	Answers aClass, as ABCMeta.register does, so it also works as a decorator."

	(self ___registeredClasses___) @env0:add: aClass.
	^ aClass
%

category: 'Grail-ABC'
classmethod: os_PathLike
___isRegistered___: aClass
	"Whether aClass, or a superclass of it, was passed to register:."

	^ (self ___registeredClasses___) @env0:anySatisfy: [:registered |
		aClass == registered or: [aClass @env0:inheritsFrom: registered]]
%

category: 'Grail-ABC'
classmethod: os_PathLike
___registeredClasses___
	"Session-local, like an import is: the registered classes are Python
	classes of this session, and must never be committed into this persistent
	class."

	^ SessionTemps @env0:current
		@env0:at: #'Grail_os_PathLike_registered'
		ifAbsentPut: [IdentitySet @env0:new]
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
	(self ___isPathLike___: path) ifTrue: [^ path __fspath__].
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

	Probes the whole class chain (___isPathLike___:) rather than the own
	method dict, so a Path SUBCLASS that inherits __fspath__ is coerced too."

	(self ___isPathLike___: path) ifTrue: [^ path __fspath__].
	"A str holding a LONE SURROGATE -- which is how os.fsdecode spells an
	undecodable byte (PEP 383) -- cannot reach the GsFile primitives as it
	is: they send it encodeAsUTF8, get the surrogatepass bytes back, and
	refuse the ByteArray with an ArgumentTypeError no Python code can catch
	(test_warnings' non-ASCII-filename tests died there, inside a
	catch_warnings block that then never restored the warnings module).

	CPython encodes such a path with surrogateescape.  Here the escaped bytes
	are handed on as the CHARACTERS of an ordinary string, since the
	primitives take a String and a raw-byte Utf8 cannot be built: a lone
	U+DC80..U+DCFF becomes its byte, and any other surrogate raises
	CPython's catchable UnicodeEncodeError.  The byte is then UTF-8-encoded
	by the primitive, so a file whose on-disk name is itself undecodable is
	still out of reach -- but a missing one is FileNotFoundError, as in
	CPython, rather than a dead session."
	(path isKindOf: PyStrSurrogate) ifTrue: [
		^ (path encode: 'utf-8' _: 'surrogateescape') decode: 'latin-1'].
	^ path
%

category: 'Grail-Filesystem'
method: os
___isPathLike___: anObject
	"Whether anObject's class OR ANY SUPERCLASS defines __fspath__.

	The one predicate behind both fspath: and ___fsPath___:, because two copies
	of it had already disagreed: ___fsPath___: probed the whole chain while the
	public os.fspath() read only the object's OWN method dict.  pathlib.Path
	inherits __fspath__ from PurePath, so os.stat(Path(...)) worked and
	os.fspath(Path(...)) raised TypeError -- which is what stopped CPython's
	zipfile from adding a file named by a Path (ZipInfo.from_file)."

	^ (anObject @env0:class @env0:whichClassIncludesSelector: #'__fspath__' environmentId: 1) notNil
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
	   'GRAIL_CODEGEN_TRACE_DIR' 'GRAIL_IR_CODEGEN' 'GRAIL_TEST_WORKERS'
	   'PYTHONPATH' 'PYTHONHOME' 'PYTHONHASHSEED' 'PYTHONUTF8' 'VIRTUAL_ENV'
	   'FLASK_DEBUG' 'FLASK_APP' 'FLASK_SKIP_DOTENV' 'DJANGO_SETTINGS_MODULE'
	   'CI' 'GITHUB_ACTIONS' 'SSH_AUTH_SOCK' 'DISPLAY' 'COLUMNS' 'LINES'
	   'http_proxy' 'HTTP_PROXY' 'https_proxy' 'HTTPS_PROXY'
	   'ftp_proxy' 'FTP_PROXY' 'all_proxy' 'ALL_PROXY'
	   'no_proxy' 'NO_PROXY' 'REQUEST_METHOD' )
		@env0:do: [:n |
			(os_Environ @env0:___envRawGet___: n) == nil
				ifFalse: [ self ___note___: n ] ].
%

category: 'Grail-Private'
method: os_Environ
___liveNames___
	"Known names that are still set right now, as Strings."

	| out |
	out := list ___new___.
	self ___knownNames___ @env0:do: [:sym |
		(os_Environ @env0:___envRawGet___: (sym @env0:asString)) == nil
			ifFalse: [ out append: (sym @env0:asString) ] ].
	^ out
%

category: 'Grail-Access Methods'
method: os_Environ
__getitem__: key
	"environ[key] — reads through; KeyError when unset, as CPython."

	| v |
	v := os_Environ @env0:___envRawGet___: (key @env0:asString).
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
	v := os_Environ @env0:___envRawGet___: (key @env0:asString).
	v == nil ifTrue: [^ default].
	self ___note___: key.
	^ v
%

category: 'Grail-Access Methods'
method: os_Environ
__contains__: key
	| v |
	v := os_Environ @env0:___envRawGet___: (key @env0:asString).
	v == nil ifTrue: [^ false].
	self ___note___: key.
	^ true
%

category: 'Grail-Access Methods'
method: os_Environ
__setitem__: key _: value
	"environ[key] = value — really does putenv, so a child process
	forked afterwards inherits it (CPython semantics)."

	os_Environ @env0:___envRawPut___: (key @env0:asString) value: (value @env0:asString).
	self ___note___: key.
	^ None
%

category: 'Grail-Access Methods'
method: os_Environ
__delitem__: key
	"del environ[key] — unsetenv.  KeyError when unset, as CPython."

	(os_Environ @env0:___envRawGet___: (key @env0:asString)) == nil
		ifTrue: [ KeyError ___signal___: (key @env0:asString) ].
	os_Environ @env0:___envRawRemove___: (key @env0:asString).
	^ None
%

category: 'Grail-Access Methods'
method: os_Environ
setdefault: key _: default
	| v |
	v := os_Environ @env0:___envRawGet___: (key @env0:asString).
	v == nil ifFalse: [ self ___note___: key. ^ v ].
	self __setitem__: key _: default.
	^ default
%

category: 'Grail-Access Methods'
method: os_Environ
pop: key _: default
	| v |
	v := os_Environ @env0:___envRawGet___: (key @env0:asString).
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
		d __setitem__: n _: (os_Environ @env0:___envRawGet___: n) ].
	^ d
%

category: 'Grail-Access Methods'
method: os_Environ
pop: key
	"environ.pop(key) — KeyError when unset, as CPython."

	| v |
	v := os_Environ @env0:___envRawGet___: (key @env0:asString).
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
		out append: (os_Environ @env0:___envRawGet___: n) ].
	^ out
%

category: 'Grail-Iteration'
method: os_Environ
items
	| out |
	out := list ___new___.
	(self ___liveNames___) @env0:do: [:n |
		out append: (tuple @env0:with: n with: (os_Environ @env0:___envRawGet___: n)) ].
	^ out
%

category: 'Grail-Conversion'
method: os_Environ
__repr__
	| parts |
	parts := list ___new___.
	(self ___liveNames___) @env0:do: [:n |
		parts append:
			((n __repr__) @env0:, ': ' @env0:, ((os_Environ @env0:___envRawGet___: n) __repr__)) ].
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

category: 'Grail-Built-in Functions'
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

category: 'Grail-Built-in Functions'
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

category: 'Grail-Built-in Functions'
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
	"The primitive answers 0 on success and the ERRNO on failure, never nil --
	the one answer this tested for, so a chdir to a missing directory changed
	nothing and said nothing, exactly as os.rename did (see Issues.md)."
	result := GsFile @env0:_directoryPrim: 0 with: path with: nil.
	result == 0 ifTrue: [^ None].
	(result @env0:isKindOf: SmallInteger) ifFalse: [
		^ OSError ___signal___: (self @env0:class ___directoryNotChangedMessage: path)].
	^ self ___signalErrno: result filename: path
%

category: 'Grail-Error Messages'
classmethod: os
___directoryNotChangedMessage: path

	^ 'Cannot change directory to: ' @env0:, path @env0:printString
%

category: 'Grail-File and Directory Operations'
method: os
mkdir: aPath
	"os.mkdir(path) — create a directory."

	| result path |
	path := self ___fsPath___: aPath.
	result := GsFile @env0:createServerDirectory: path.
	result == nil ifTrue: [self ___signalDirectoryNotCreated: path].
	^ None
%

category: 'Grail-File and Directory Operations'
method: os
mkdir: aPath _: mode
	"os.mkdir(path, mode) — create a directory with numeric mode."

	| result path |
	path := self ___fsPath___: aPath.
	result := GsFile @env0:createServerDirectory: path mode: mode.
	result == nil ifTrue: [self ___signalDirectoryNotCreated: path].
	^ None
%

category: 'Grail-File and Directory Operations'
method: os
___signalDirectoryNotCreated: path
	"Raise what CPython's os.mkdir raises: the errno's own OSError subclass,
	carrying errno, strerror and filename.  CPython's Path.mkdir(parents=True)
	catches FileNotFoundError to create the missing parents, so the plain
	OSError raised here before broke it -- where the old pathlib stub, which
	called makedirs instead, had worked.

	The primitive answers only nil, so the errno is read back from the
	filesystem, not from GsFile's error text.  That text was tried first: its
	form is not the same on every platform, and parsing it worked on Darwin
	and fell through to the plain OSError on CI's Linux gem.  What the
	filesystem cannot tell -- a directory that exists but refuses the entry --
	keeps the plain OSError."

	| errno |

	errno := self ___errnoPreventingCreationOf: path.
	errno == 0 ifTrue: [^ OSError ___signal___: (self @env0:class ___directoryNotCreatedMessage: path)].
	^ self ___signalErrno: errno filename: path
%

category: 'Grail-File and Directory Operations'
method: os
___errnoPreventingCreationOf: path
	"Why an entry cannot be created at path: the path is already there, or its
	parent cannot be stat'd (that stat's own errno), or the parent is not a
	directory.  0 when none of those holds.  mkdir asks after its primitive
	failed; symlink asks before, since its shell command reports nothing."

	| parentStat |

	((GsFile @env0:stat: path isLstat: true) @env0:isKindOf: GsFileStat) ifTrue: [^ 17].
	parentStat := GsFile @env0:stat: (self ___parentDirectoryOf: path) isLstat: false.
	(parentStat @env0:isKindOf: SmallInteger) ifTrue: [^ parentStat].
	((parentStat @env0:isKindOf: GsFileStat) and: [parentStat @env0:isDirectory @env0:not])
		ifTrue: [^ 20].
	^ 0
%

category: 'Grail-File and Directory Operations'
method: os
___parentDirectoryOf: path
	"The directory an entry at path is created in: '.' for a bare name."

	| parent |

	parent := (os_path instance) dirname: ((os_path instance) normpath: path).
	^ parent @env0:isEmpty ifTrue: ['.'] ifFalse: [parent]
%

category: 'Grail-File and Directory Operations'
method: os
___signalErrno: anErrno filename: aPath
	"CPython's OSError for a call on one path that failed with anErrno: the
	errno's own subclass, carrying errno, strerror and filename."

	^ (self @env0:class ___errorClassForErrno: anErrno)
		___signalNew___: { anErrno. self strerror: anErrno. aPath }
		kw: nil
%

category: 'Grail-File and Directory Operations'
method: os
___signalErrno: anErrno filename: aPath filename2: anotherPath
	"As ___signalErrno:filename:, for a call on two paths.  The fourth argument
	is winerror, which is None off Windows; CPython prints both names:
	``[Errno 2] No such file or directory: 'a' -> 'b'''."

	^ (self @env0:class ___errorClassForErrno: anErrno)
		___signalNew___: { anErrno. self strerror: anErrno. aPath. None. anotherPath }
		kw: nil
%

category: 'Grail-Error Messages'
classmethod: os
___errorClassForErrno: anErrno
	"The OSError subclass CPython raises for an errno.  OSError owns the map,
	because CPython's OSError.__new__ consults the same one -- so an errno
	names the same class whether it arrives from here or from
	``OSError(errno, strerror)'' written in Python."

	^ OSError ___classForErrno: anErrno
%

category: 'Grail-Built-in Functions'
method: os
strerror: code
	"os.strerror(code) -- libc's own strerror(), so the text is the platform's.
	Darwin and Linux word some errnos differently, and a table here would be
	right on one of them."

	^ self @env0:class ___strerrorCallout @env0:callWith: { self ___asCInt: code }
%

category: 'Grail-Private'
method: os
___asCInt: anObject
	"anObject as the C int a libc call takes, raising what CPython's argument
	conversion raises.  The callout itself answers a Smalltalk ArgumentError
	for anything else, which Python code cannot catch."

	| integer |

	integer := anObject ___asIndex___.
	(integer @env0:between: -2147483648 and: 2147483647) ifFalse: [
		^ OverflowError ___signal___: self @env0:class ___cIntOverflowMessage].
	^ integer
%

category: 'Grail-Error Messages'
classmethod: os
___cIntOverflowMessage
	"CPython says ``too large'' on both sides of the range."

	^ 'Python int too large to convert to C int'
%

category: 'Grail-Error Messages'
classmethod: os
___strerrorCallout
	"A CCallout wraps per-process C state, so it is cached in SessionTemps and
	each gem builds its own on first use, as zlib's callouts are."

	^ SessionTemps @env0:current
		@env0:at: #'Grail_os_strerror_callout'
		ifAbsentPut: [
			CCallout
				@env0:library: (CLibrary @env0:named: self ___libcName)
				name: 'strerror'
				result: #'char*'
				args: #(#'int32')]
%

category: 'Grail-Error Messages'
classmethod: os
___libcName
	"By the soname the loader resolves, as zlib names libz: glibc's runtime
	soname on Linux."

	^ self ___isDarwin
		ifTrue: ['libc.dylib']
		ifFalse: ['libc.so.6']
%

category: 'Grail-Error Messages'
classmethod: os
___isDarwin
	"Which platform's errno numbering and libc naming applies.  The errnos a
	FILE operation reports agree on Darwin and Linux except where a method
	below says otherwise."

	^ (System @env0:gemVersionAt: #osName) @env0:= 'Darwin'
%

category: 'Grail-Initialization'
classmethod: os
___openFlags
	"The open(2) flags whose numbers differ by platform, as glibc and Darwin's
	<fcntl.h> define them.  Linux's O_NOFOLLOW is itself per-architecture:
	x86_64 keeps the historic 0400000, aarch64 uses the asm-generic 0100000."

	| d arch |
	d := SymbolKeyValueDictionary @env0:new.
	arch := (System @env0:gemVersionAt: #cpuArchitecture) @env0:asLowercase.
	self ___isDarwin
		ifTrue: [
			d @env0:at: #O_APPEND put: 8.
			d @env0:at: #O_CREAT put: 512.
			d @env0:at: #O_TRUNC put: 1024.
			d @env0:at: #O_EXCL put: 2048.
			d @env0:at: #O_NOFOLLOW put: 256.
			d @env0:at: #O_CLOEXEC put: 16777216]
		ifFalse: [
			d @env0:at: #O_APPEND put: 1024.
			d @env0:at: #O_CREAT put: 64.
			d @env0:at: #O_TRUNC put: 512.
			d @env0:at: #O_EXCL put: 128.
			d @env0:at: #O_NOFOLLOW put:
				((arch @env0:includesString: 'arm') @env0:or: [arch @env0:includesString: 'aarch'])
					ifTrue: [32768]
					ifFalse: [131072].
			d @env0:at: #O_CLOEXEC put: 524288].
	^ d
%

category: 'Grail-Error Messages'
classmethod: os
___errnoOfADirectoryNotEmpty
	"ENOTEMPTY, which Darwin numbers 66 and Linux 39.  It has no OSError
	subclass of its own on either."

	^ self ___isDarwin ifTrue: [66] ifFalse: [39]
%

category: 'Grail-Error Messages'
classmethod: os
___errnoOfUnlinkingADirectory
	"unlink(2) of a directory: EPERM on Darwin (PermissionError), EISDIR on
	Linux (IsADirectoryError).  CPython reports whichever the platform gives."

	^ self ___isDarwin ifTrue: [1] ifFalse: [21]
%

category: 'Grail-Error Messages'
classmethod: os
___directoryNotCreatedMessage: path

	^ 'Cannot create directory: ' @env0:, path @env0:printString
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
_makedirs: positional kw: kwargs
	"os.makedirs(name, mode=0o777, exist_ok=False), for a call that passes any
	argument by keyword.  CPython's zipfile extracts with
	``os.makedirs(upperdirs, exist_ok=True)'', and without this form that call
	matched no selector and raised TypeError before a single member was written.

	It reaches makedirs: and changes nothing about what that does.  makedirs:
	creates only the missing components and never raises when the directory is
	already there -- so exist_ok=True is exactly its behaviour, and
	exist_ok=False does NOT raise FileExistsError as CPython would.  That gap
	belongs to makedirs: itself (both spellings share it), and is recorded in
	docs/Issues.md rather than changed here.  mode is accepted and, as by
	makedirs:, not applied."

	^ self makedirs:
		(self ___requiredArgument: 'name' at: 1 in: positional kw: kwargs for: 'makedirs')
%

category: 'Grail-File and Directory Operations'
method: os
___requiredArgument: aName at: anIndex in: positional kw: kwargs for: aFunctionName
	"A required argument, by position or else by keyword, as CPython binds it."

	positional @env0:size @env0:>= anIndex ifTrue: [^ positional @env0:at: anIndex].
	(kwargs notNil and: [kwargs @env0:includesKey: aName])
		ifTrue: [^ kwargs @env0:at: aName].
	^ TypeError ___signal___:
		(self @env0:class ___missingArgumentMessage: aName at: anIndex for: aFunctionName)
%

category: 'Grail-Error Messages'
classmethod: os
___missingArgumentMessage: aName at: anIndex for: aFunctionName

	^ aFunctionName @env0:, '() missing required argument ''' @env0:, aName
		@env0:, ''' (pos ' @env0:, anIndex @env0:printString @env0:, ')'
%

category: 'Grail-Error Messages'
classmethod: os
___dirFdUnavailableMessage: aFunctionName

	^ aFunctionName @env0:, ': dir_fd unavailable on this platform'
%

category: 'Grail-File and Directory Operations'
method: os
_stat: positional kw: kwargs
	"os.stat(path, *, dir_fd=None, follow_symlinks=True), for a call that passes
	a keyword.  CPython's pathlib stats with ``os.stat(path,
	follow_symlinks=...)'', so Path.stat() matched no selector at all before
	this.  follow_symlinks=False IS lstat, as CPython defines it.

	dir_fd is refused rather than ignored: os.supports_dir_fd is empty on
	purpose, and silently statting a path relative to the wrong directory
	would answer about a different file."

	| path |

	path := self ___requiredArgument: 'path' at: 1 in: positional kw: kwargs for: 'stat'.
	(kwargs notNil and: [(kwargs @env0:at: 'dir_fd' ifAbsent: [None]) ~~ None])
		ifTrue: [^ NotImplementedError ___signal___: (self @env0:class ___dirFdUnavailableMessage: 'stat')].
	(self ___followsSymlinks: kwargs) ifFalse: [^ self lstat: path].
	^ self stat: path
%

category: 'Grail-File and Directory Operations'
method: os
___refuseShellExpandedPath___: aPath for: anOperation
	"Raise rather than let a DESTRUCTIVE operation act on a path other than the
	one the caller named.

	GemStone's server-file primitives run their argument through shell-style
	variable expansion, so ``a$b'' reaches the filesystem as ``a''.  Three
	measured consequences, on 4.0:

	    GsFile _expandFilename: '/tmp/d/a$b' isClient: false  ->  '/tmp/d/a'
	    GsFile existsOnServer:  '/tmp/d/a$b'                  ->  true (it saw a)
	    GsFile sizeOfOnServer:  '/tmp/d/a$b'                  ->  5    (a's size)

	so os.remove('a$b') passed its existence check by looking at a DIFFERENT
	file, deleted that file, and returned normally.  The caller was told the
	removal succeeded; the file they named was still there and an unrelated one
	was gone (issue #861).

	It is silent exactly when it is most dangerous.  When the expansion names
	something that does not exist the primitive fails and the OSError sends the
	caller down a working fallback path -- which is why this went unnoticed.
	When the expansion names a REAL file, that file is destroyed and nothing is
	reported.

	``$'' is the test because ``$'' is the whole of it: measured on 4.0, these
	primitives interpret nothing else.  ``~'', ``*'', ``?'' and embedded spaces
	all reach the filesystem unchanged, and every ``$'' form tried -- ``$VAR'',
	an undefined ``$NOPE'', a bare ``$'' -- changed the path.

	NOT applied to the read-only entry points.  os.path.exists('a$b') answering
	for another file is a wrong ANSWER; os.remove('a$b') deleting another file
	is a wrong ACTION, and only the second can destroy data.  Narrowing the
	guard to the three destructive operations also keeps it off every stat-like
	call, which the predicate fixtures already document as expanding."

	| expanded |
	(aPath @env0:isKindOf: CharacterCollection) ifFalse: [^ self].
	(aPath @env0:includesValue: $$) ifFalse: [^ self].
	expanded := [GsFile @env0:_expandFilename: aPath @env0:asString isClient: false]
		@env0:on: Error do: [:ex | ex @env0:return: nil].
	OSError ___signal___: (((((anOperation @env0:, ' cannot address ')
		@env0:, (aPath @env0:printString))
		@env0:, ': the server file primitives expand ''$'', so this would act on ')
		@env0:, (expanded @env0:isNil
			ifTrue: ['a different path']
			ifFalse: [expanded @env0:printString]))
		@env0:, ' instead')
%

category: 'Grail-File and Directory Operations'
method: os
rmdir: aPath
	"os.rmdir(path) — remove a directory."

	| result path |
	path := self ___fsPath___: aPath.
	self ___refuseShellExpandedPath___: path for: 'rmdir'.
	result := GsFile @env0:removeServerDirectory: path.
	result == nil ifTrue: [^ self ___signalDirectoryNotRemoved: path].
	^ None
%

category: 'Grail-File and Directory Operations'
method: os
___signalDirectoryNotRemoved: path
	"Raise what CPython's os.rmdir raises.  The primitive answers only nil, so
	the errno is read back from the filesystem, as os.mkdir's is."

	| errno |

	errno := self ___errnoPreventingRemovalOfDirectory: path.
	errno == 0 ifTrue: [^ OSError ___signal___: (self @env0:class ___directoryNotRemovedMessage: path)].
	^ self ___signalErrno: errno filename: path
%

category: 'Grail-File and Directory Operations'
method: os
___errnoPreventingRemovalOfDirectory: path
	"Why rmdir of path failed: it cannot be lstat'd (that stat's own errno),
	it is not a directory -- a SYMLINK to one included, which is why the probe
	is an lstat -- or it still holds entries.  0 when none of those holds."

	| entryStat |

	entryStat := GsFile @env0:stat: path isLstat: true.
	(entryStat @env0:isKindOf: SmallInteger) ifTrue: [^ entryStat].
	((entryStat @env0:isKindOf: GsFileStat) and: [entryStat @env0:isDirectory @env0:not])
		ifTrue: [^ 20].
	(self ___isEmptyDirectory: path) ifFalse: [^ self @env0:class ___errnoOfADirectoryNotEmpty].
	^ 0
%

category: 'Grail-File and Directory Operations'
method: os
___isEmptyDirectory: path
	"True when path holds nothing of its own.  The primitive reports '.' and
	'..', which CPython's listing never does and which are not entries a
	caller put there."

	| contents |

	contents := GsFile
		@env0:_contentsOfServerDirectory: path
		expandPath: false
		utf8Results: false.
	(contents @env0:isKindOf: Array) ifFalse: [^ true].
	^ (contents @env0:reject: [:each | | name |
		name := each @env0:asString.
		(name @env0:= '.') @env0:or: [name @env0:= '..']]) @env0:isEmpty
%

category: 'Grail-Error Messages'
classmethod: os
___directoryNotRemovedMessage: path

	^ 'Cannot remove directory: ' @env0:, path @env0:printString
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
	"BEFORE the existence check, which is itself expanding and would otherwise
	report on whatever the expansion names -- see ___refuseShellExpandedPath___."
	self ___refuseShellExpandedPath___: path for: 'remove'.
	"lstat, not exists: ``exists'' FOLLOWS a symlink, so a DANGLING one -- a
	link whose target is gone, which is legal and which os.symlink can create
	deliberately -- looked absent and raised FileNotFoundError instead of being
	unlinked.  CPython removes the LINK, and never consults the target at all."
	self ___statOrSignal___: path isLstat: true.
	result := GsFile @env0:removeServerFile: path.
	result == nil ifTrue: [^ self ___signalFileNotRemoved: path].
	^ None
%

category: 'Grail-File and Directory Operations'
method: os
___signalFileNotRemoved: path
	"Raise what CPython's os.remove raises.  The primitive answers only nil, so
	the errno is read back from the filesystem, as os.mkdir's is."

	| errno |

	errno := self ___errnoPreventingUnlinkOf: path.
	errno == 0 ifTrue: [^ OSError ___signal___: (self @env0:class ___fileNotRemovedMessage: path)].
	^ self ___signalErrno: errno filename: path
%

category: 'Grail-File and Directory Operations'
method: os
___errnoPreventingUnlinkOf: path
	"Why unlinking path failed: it is a directory, which the two platforms
	report differently.  The lstat has already passed by the time this is
	asked, so 0 means a permission it cannot see."

	| entryStat |

	entryStat := GsFile @env0:stat: path isLstat: true.
	(entryStat @env0:isKindOf: SmallInteger) ifTrue: [^ entryStat].
	((entryStat @env0:isKindOf: GsFileStat) and: [entryStat @env0:isDirectory])
		ifTrue: [^ self @env0:class ___errnoOfUnlinkingADirectory].
	^ 0
%

category: 'Grail-Error Messages'
classmethod: os
___fileNotRemovedMessage: path

	^ 'Cannot remove file: ' @env0:, path @env0:printString
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
	"os.rename(old, new) — rename a file or directory.

	The primitive answers 0 on success and the errno on failure.  This used to
	test only for nil, which it answers for neither, so a rename that FAILED
	returned normally: renaming a file that did not exist moved nothing and
	said nothing, and pathlib's Path.rename inherited it."

	| result oldPath newPath |
	oldPath := self ___fsPath___: anOldPath.
	newPath := self ___fsPath___: aNewPath.
	"Both ends: a rename can destroy the destination as surely as remove does,
	and an expanded SOURCE renames a file the caller never named."
	self ___refuseShellExpandedPath___: oldPath for: 'rename'.
	self ___refuseShellExpandedPath___: newPath for: 'rename'.
	result := GsFile @env0:renameFileOnServer: oldPath to: newPath.
	result == 0 ifTrue: [^ None].
	(result @env0:isKindOf: SmallInteger) ifFalse: [
		^ OSError ___signal___: (self @env0:class ___renameFailedMessage: oldPath to: newPath)].
	^ self ___signalErrno: result filename: oldPath filename2: newPath
%

category: 'Grail-File and Directory Operations'
method: os
replace: aSource _: aDestination
	"os.replace(src, dst).  On POSIX this is rename(2) itself, which already
	replaces an existing destination -- CPython's posixmodule makes the same
	call for both.  pathlib's Path.replace and Path.move reach os through it."

	^ self rename: aSource _: aDestination
%

category: 'Grail-Error Messages'
classmethod: os
___renameFailedMessage: anOldPath to: aNewPath

	^ 'Cannot rename: ' @env0:, anOldPath @env0:printString @env0:, ' to ' @env0:, aNewPath @env0:printString
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

	So the check is on the path, before listing.  Its errors are raised as
	___statOrSignal___:isLstat: raises them; that method had to learn the same
	lesson about this API answering a non-error on failure.

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
	(dirContents @env0:isKindOf: SmallInteger) ifTrue: [
		^ self ___signalErrno: dirContents filename: actualPath].
	(dirContents @env0:isKindOf: Array) ifFalse: [
		^ OSError ___signal___: (self @env0:class ___listingFailedMessage: actualPath)].
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
	^ self ___followsSymlinks: kwargs
%

category: 'Grail-File and Directory Operations'
method: os
___followsSymlinks: kwargs
	"The keyword-only follow_symlinks argument, true when absent."

	(kwargs notNil and: [kwargs @env0:includesKey: 'follow_symlinks'])
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

category: 'Grail-Built-in Functions'
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

	The errors CPython raises are predicted BEFORE the command, since the
	command reports no status: an occupied dst is FileExistsError -- a
	DANGLING symlink included, which is why the probe is an lstat -- a missing
	parent FileNotFoundError, and a parent that is a file NotADirectoryError.
	CPython names both paths in them.  Anything else that goes wrong is caught
	after the fact by asking whether the link now exists."

	| srcPath dstPath errno |
	srcPath := self ___fsPath___: src.
	dstPath := self ___fsPath___: dst.
	errno := self ___errnoPreventingCreationOf: dstPath.
	errno == 0 ifFalse: [^ self ___signalErrno: errno filename: srcPath filename2: dstPath].
	self ___runShell___: 'ln -s -- ' @env0:,
		(self ___shellQuote___: srcPath) @env0:, ' ' @env0:,
		(self ___shellQuote___: dstPath).
	(self ___isLink___: dstPath) ifFalse: [
		OSError ___signal___: (self @env0:class ___symlinkNotCreatedMessage: dstPath)].
	^ None
%

category: 'Grail-Error Messages'
classmethod: os
___symlinkNotCreatedMessage: path

	^ 'Cannot create symbolic link: ' @env0:, path @env0:printString
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
	self ___statOrSignal___: path isLstat: true.
	(self ___isLink___: path) ifFalse: [^ self ___signalErrno: 22 filename: path].
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

	| top topdown onerror followlinks linksAreFiles |
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
	"The sentinel is an ordinary object, so ___isTruthy___ answers TRUE for it
	-- it would read as followlinks=True, the opposite of what Path.walk asks
	for.  Identity is the test, as it is in CPython."
	linksAreFiles := followlinks == self ___walkSymlinksAsFiles.
	^ self ___walk___: top
		topdown: topdown ___isTruthy___
		onerror: onerror
		followlinks: (linksAreFiles @env0:not and: [followlinks ___isTruthy___])
		linksAreFiles: linksAreFiles
%

category: 'Grail-File and Directory Operations'
method: os
___isWalkDirectory___: aPath linksAreFiles: linksAreFiles
	"Whether os.walk counts aPath as a directory to descend into.

	isdir FOLLOWS a symlink, so by default a link to a directory is reported
	in dirnames and ``followlinks'' decides whether it is entered.  Under
	os._walk_symlinks_as_files it is a FILE instead, which is CPython's
	``entry.is_dir(follow_symlinks=False)'' -- the lstat answer."

	(self isdir: aPath) ifFalse: [^ false].
	^ linksAreFiles @env0:not @env0:or: [(self ___isLink___: aPath) @env0:not]
%

category: 'Grail-File and Directory Operations'
method: os
___walkSymlinksAsFiles
	"The sentinel os.walk compares its followlinks against; see where it is
	created for what it asks for."

	^ self @env0:at: #'_walk_symlinks_as_files'
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
___walk___: aTop topdown: topdown onerror: onerror followlinks: followlinks linksAreFiles: linksAreFiles
	"The generator behind os.walk -- see _walk:kw: for the argument handling
	and for why this is a generator at all.  topdown/followlinks arrive as
	Smalltalk Booleans, already truth-tested.

	linksAreFiles is the os._walk_symlinks_as_files mode, which Path.walk asks
	for: a symlink to a directory belongs in FILENAMES rather than dirnames,
	so it is neither reported as a directory nor descended into."

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
							isDir := [self ___isWalkDirectory___: full linksAreFiles: linksAreFiles]
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
	Python-level error instead of a stray message send.  The errno is raised
	as CPython raises it -- its own subclass, carrying errno, strerror and
	filename.  open() and gzip.open() ask here why a file will not open, so
	that is where their ``e.filename'' comes from too."

	| result |
	result := GsFile @env0:stat: path isLstat: isLstat.
	(result @env0:isKindOf: GsFileStat) ifTrue: [^ result].
	(result @env0:isKindOf: SmallInteger) ifTrue: [^ self ___signalErrno: result filename: path].
	^ OSError ___signal___: (self @env0:class ___statFailedMessage: path)
%

category: 'Grail-Error Messages'
classmethod: os
___statFailedMessage: path

	^ 'Cannot stat: ' @env0:, path @env0:printString
%

category: 'Grail-Error Messages'
classmethod: os
___listingFailedMessage: path

	^ 'Cannot list directory: ' @env0:, path @env0:printString
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
	self ___statOrSignal___: path isLstat: followSymlinks @env0:not.
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
		ifFalse: [^ self ___signalErrno: 1 filename: path].
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

	A failure to apply the times raises PermissionError, which is CPython's
	class for the usual causes: not owning the file, or not being allowed to
	write it.  performOnServer: hands back no exit status to tell the causes
	apart, so the errno is always EPERM, and a read-only filesystem (EROFS
	in CPython, a plain OSError) is reported the same way."

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
! File permissions — os.chmod
! ===============================================================================

category: 'Grail-File and Directory Operations'
method: os
___shellPathArg___: aPath
	"A path as ONE shell word that no utility can mistake for an OPTION.

	___shellQuote___: alone is not enough, and the gap is a real one measured
	here rather than reasoned about.  Quoting is a SHELL concern: after the
	shell strips the quotes, ``chmod 0600 '-rw'`` hands chmod an argv entry
	that still begins with a ``-'', and chmod parses it as flags.  The usual
	guard is ``--'', which os.symlink/os.readlink/os.utime all use -- and which
	BSD chmod DOES NOT IMPLEMENT.  Measured on macOS 26.6:

	    $ chmod 0600 -- normal
	    chmod: --: No such file or directory   (exit 1, and `normal' IS chmod'ed)

	so on this platform ``--'' is consumed as a filename, leaving a leading-dash
	path exactly as exposed as it was before, plus a spurious error on every
	call.  GNU chmod (Linux, and so CI) does honour it, which is the worst shape
	a guard can have: it protects only the platform you are not testing on.

	Making the path itself unambiguous works everywhere and needs no cooperation
	from the utility -- a path that starts with ``-'' is prefixed with ``./'',
	naming the same file.  Everything else is quoted unchanged."

	| s |
	s := (self ___fsPath___: aPath) @env0:asString.
	(s @env0:isEmpty @env0:not @env0:and: [(s @env0:at: 1) @env0:= $-])
		ifTrue: [s := './' @env0:, s].
	^ self ___shellQuote___: s
%

category: 'Grail-File and Directory Operations'
method: os
___octalString___: anInteger
	"anInteger as four-or-more plain octal digits, for chmod(1).

	printStringRadix: answers bare digits here (no ``8r'' prefix), and the
	zero-padding is so a mode is never handed over in a shape a reader has to
	squint at: 0 becomes ``0000'' rather than ``0''."

	| s |
	s := anInteger @env0:printStringRadix: 8.
	[s @env0:size @env0:< 4] @env0:whileTrue: [s := '0' @env0:, s].
	^ s
%

category: 'Grail-File and Directory Operations'
method: os
___applyChmod___: aPath mode: aMode
	"Set aPath's permission bits to aMode and answer None.  The one place that
	actually changes a mode; os.chmod funnels here once its arguments are
	settled.

	Runs chmod(1), because GemStone exposes no chmod(2): GsFile can READ a mode
	(GsFileStat>>mode) but not write one.  The path goes through
	___shellPathArg___:, NOT the bare ___shellQuote___: the other shelled-out
	os calls use -- see that method for why ``--'' is not a portable guard for
	this particular utility.

	ONLY THE LOW 12 BITS are sent.  CPython hands the mode straight to chmod(2),
	which ignores the file-type bits; measured, ``os.chmod(f, 0o100644)'' leaves
	a file at 0o644 under CPython 3.14.6, so masking here reproduces that rather
	than letting chmod(1) parse a six-digit octal number as something else.

	System>>performOnServer: reports no exit status, so SUCCESS IS MEASURED,
	not assumed -- the file is re-stat'd and the permission bits read back must
	be the ones asked for.  This matters more for chmod than for anything else
	that shells out: a chmod that silently did nothing would leave a file MORE
	permissive than the caller believes it made it, which is a security answer,
	not merely a wrong one.

	The command is SKIPPED when the mode is already correct.  That is an
	optimisation (copystat on a tree spawns a process per file otherwise) and
	not a weakening: the read-back below is what decides, and the stat it reads
	is the one taken after any command that ran."

	| path st want |
	want := aMode @env0:bitAnd: 8r7777.
	path := self ___fsPath___: aPath.
	st := self ___statOrSignal___: path isLstat: false.
	(st @env0:mode @env0:bitAnd: 8r7777) @env0:= want ifTrue: [^ None].
	self ___runShell___: 'chmod ' @env0:, (self ___octalString___: want)
		@env0:, ' ' @env0:, (self ___shellPathArg___: path).
	st := self ___statOrNil___: path lstat: false.
	(st @env0:notNil @env0:and: [(st @env0:mode @env0:bitAnd: 8r7777) @env0:= want])
		ifFalse: [^ self ___signalErrno: 1 filename: path].
	^ None
%

category: 'Grail-File and Directory Operations'
method: os
_chmod: positional kw: kwargs
	"os.chmod(path, mode, *, dir_fd=None, follow_symlinks=True).

	WHAT A CALLER CAN RELY ON.  The mode is REALLY SET -- ___applyChmod___
	reads it back and raises if it did not take -- for the low 12 bits, on a
	file or a directory.  os.stat().st_mode afterwards reports the value asked
	for.

	follow_symlinks=False is NOT implemented, and raises NotImplementedError.
	That is CPython's own answer on Linux, where lchmod(2) does not exist:
	``os.chmod in os.supports_follow_symlinks'' is False there and copystat
	skips the call.  (macOS CPython does have lchmod and does support it, so
	this is a deviation from CPython-on-macOS and a match for CPython-on-Linux,
	which is the platform CI measures.)  The reason not to fake it is that the
	two chmod(1) implementations disagree: BSD chmod has ``-h'', GNU chmod has
	no such flag at all, so the command would silently follow the link on Linux
	and change the WRONG file's permissions.  Refusing is the only answer that
	is not a security bug on one of the two platforms.

	dir_fd is not implemented either, for the reason os.utime gives: CPython
	honours it on both platforms, so resolving the path against the process's
	cwd instead would be a wrong answer rather than a missing feature.

	os.chmod is deliberately NOT added to os.supports_follow_symlinks -- both
	because it does not support it, and because membership there is tested by
	object identity and an attribute load here builds a fresh BoundMethod each
	time.

	A failure to apply the mode raises PermissionError with EPERM, which is
	what CPython raises for the usual cause, not owning the file.
	performOnServer: hands back no exit status to tell the causes apart, so a
	read-only filesystem (EROFS in CPython, a plain OSError) is reported the
	same way."

	| n path mode |
	n := positional @env0:size.
	n @env0:< 2 ifTrue: [
		TypeError ___signal___:
			'chmod() missing required argument ''mode'' (pos 2)'].
	n @env0:> 2 ifTrue: [
		TypeError ___signal___: ('chmod() takes at most 2 positional arguments ('
			@env0:, (n @env0:printString) @env0:, ' given)')].
	path := positional @env0:at: 1.
	mode := positional @env0:at: 2.
	(mode @env0:isKindOf: Integer) ifFalse: [
		TypeError ___signal___: ('''' @env0:,
			(bytes ___pyTypeNameOf___: mode) @env0:,
			''' object cannot be interpreted as an integer')].
	mode @env0:< 0 ifTrue: [
		ValueError ___signal___: 'chmod: mode must not be negative'].
	(kwargs @env0:isNil @env0:or: [kwargs @env0:isEmpty]) ifFalse: [
		kwargs @env0:keysDo: [:k | | key |
			key := k @env0:asString.
			(#( 'dir_fd' 'follow_symlinks' ) @env0:includes: key)
				ifFalse: [
					TypeError ___signal___:
						('chmod() got an unexpected keyword argument '''
							@env0:, key @env0:, '''')].
			key @env0:= 'dir_fd' ifTrue: [
				(kwargs @env0:at: k) == None ifFalse: [
					NotImplementedError ___signal___:
						'chmod: dir_fd unavailable on this platform']].
			key @env0:= 'follow_symlinks' ifTrue: [
				(kwargs @env0:at: k) ___isTruthy___ ifFalse: [
					NotImplementedError ___signal___:
						'chmod: follow_symlinks unavailable on this platform']]]].
	^ self ___applyChmod___: path mode: mode
%

category: 'Grail-File and Directory Operations'
method: os
chmod: aPath _: aMode
	"os.chmod(path, mode) -- 2-arg fast path.  Delegates to _chmod:kw: so
	there is one set of semantics."

	^ self _chmod: { aPath . aMode } kw: nil
%

! ===============================================================================
! File descriptors — os.open / read / readinto / write / lseek / fstat /
! ftruncate / isatty / close, straight onto libc
! ===============================================================================
!
! _pyio.FileIO is built entirely on these, so without them every _pyio file
! (test_bufio's PyBufferSizeTest, and any code importing _pyio) died on its
! first ``os.open'' with AttributeError.
!
! ONE DELIBERATE DIVERGENCE: a descriptor is usable only if os.open handed it
! out in this session.  Any other number is EBADF, exactly what CPython
! answers for a descriptor that is not open.  The gem shares its process with
! Grail, and its own descriptors -- the stone and NetLDI sockets, its log --
! sit in the same table: the first os.open in a fresh gem answered 10, not 3.
! ``os.close(5)'' or ``os.write(6, ...)'' on one of those would break the
! session in ways no Python handler can see, so the answer CPython gives for a
! closed descriptor is the one given for a descriptor that is not Grail's.

category: 'Grail-File Descriptors'
classmethod: os
___fdCallouts
	"The libc callouts behind the descriptor functions.  A CCallout wraps
	per-process C state, so the table lives in SessionTemps, as strerror's does.

	open(2) is VARIADIC, and it has to be declared so: on Apple arm64 a
	variadic argument travels on the stack rather than in a register, so a
	fixed three-argument declaration would hand open() a garbage mode."

	^ SessionTemps @env0:current
		@env0:at: #'Grail_os_fd_callouts'
		ifAbsentPut: [ | lib d |
			lib := CLibrary @env0:named: self ___libcName.
			d := SymbolKeyValueDictionary @env0:new.
			d @env0:at: #open put: (CCallout @env0:library: lib name: 'open'
				result: #'int32' args: #(#'ptr' #'int32') varArgsAfter: 2).
			d @env0:at: #close put: (CCallout @env0:library: lib name: 'close'
				result: #'int32' args: #(#'int32')).
			d @env0:at: #read put: (CCallout @env0:library: lib name: 'read'
				result: #'int64' args: #(#'int32' #'ptr' #'uint64')).
			d @env0:at: #write put: (CCallout @env0:library: lib name: 'write'
				result: #'int64' args: #(#'int32' #'ptr' #'uint64')).
			d @env0:at: #lseek put: (CCallout @env0:library: lib name: 'lseek'
				result: #'int64' args: #(#'int32' #'int64' #'int32')).
			d @env0:at: #ftruncate put: (CCallout @env0:library: lib name: 'ftruncate'
				result: #'int32' args: #(#'int32' #'int64')).
			d @env0:at: #isatty put: (CCallout @env0:library: lib name: 'isatty'
				result: #'int32' args: #(#'int32')).
			d]
%

category: 'Grail-File Descriptors'
classmethod: os
___openFds
	"The descriptors os.open has handed out in this session and os.close has
	not yet taken back.  Per session, like the descriptors themselves: they
	belong to this gem's process."

	^ SessionTemps @env0:current
		@env0:at: #'Grail_os_open_fds'
		ifAbsentPut: [IdentitySet @env0:new]
%

category: 'Grail-File Descriptors'
method: os
___libc: aName with: anArray
	"Call libc's aName, answering its result, or raising the errno's own OSError
	subclass when it reports failure with -1."

	^ self ___libc: aName with: anArray ifFail: [:errno | self ___signalErrno: errno]
%

category: 'Grail-File Descriptors'
method: os
___libc: aName with: anArray ifFail: aBlock
	"As ___libc:with:, handing the errno of a failure to aBlock."

	| errno result |
	errno := Array @env0:new: 1.
	result := (self @env0:class ___fdCallouts @env0:at: aName)
		@env0:callWith: anArray errno: errno.
	result @env0:= -1 ifTrue: [^ aBlock @env0:value: (errno @env0:at: 1)].
	^ result
%

category: 'Grail-File Descriptors'
method: os
___signalErrno: anErrno
	"CPython's OSError for a call on a DESCRIPTOR: no filename, so it prints
	``[Errno 9] Bad file descriptor'' with nothing after it."

	^ (self @env0:class ___errorClassForErrno: anErrno)
		___signalNew___: { anErrno. self strerror: anErrno }
		kw: nil
%

category: 'Grail-File Descriptors'
method: os
___fd: anObject
	"anObject as a descriptor this session may use -- see the section comment.
	EBADF, which Darwin and Linux both number 9, for anything else."

	| fd |
	fd := self ___asCInt: anObject.
	(self @env0:class ___openFds @env0:includes: fd) ifFalse: [^ self ___signalErrno: 9].
	^ fd
%

category: 'Grail-File Descriptors'
method: os
___cPathFor: aPath
	"aPath as the NUL-terminated bytes libc takes: a str as UTF-8, bytes as
	they are.  An embedded NUL would silently cut the path short in C, so it
	is CPython's ValueError instead."

	| path encoded |
	path := self ___fsPath___: aPath.
	(path @env0:isKindOf: ByteArray)
		ifTrue: [encoded := path]
		ifFalse: [
			(path @env0:isKindOf: CharacterCollection) ifFalse: [
				^ TypeError ___signal___:
					('open: path should be string, bytes or os.PathLike, not '
						@env0:, (bytes ___pyTypeNameOf___: aPath))].
			encoded := path @env0:encodeAsUTF8 @env0:asByteArray].
	(encoded @env0:includes: 0) ifTrue: [
		^ ValueError ___signal___: 'open: embedded null character in path'].
	^ CByteArray @env0:withAll: encoded nullTerminate: true
%

category: 'Grail-File Descriptors'
method: os
open: aPath _: flags
	"os.open(path, flags) -- the default mode is 0o777, as CPython's is."

	^ self _open: { aPath. flags } kw: nil
%

category: 'Grail-File Descriptors'
method: os
open: aPath _: flags _: mode

	^ self _open: { aPath. flags. mode } kw: nil
%

category: 'Grail-File Descriptors'
method: os
_open: positional kw: kwargs
	"os.open(path, flags, mode=0o777, *, dir_fd=None) -- open(2), answering the
	new descriptor.  The flags are this platform's own (see ___openFlags), and
	libc sees the path exactly as given: none of the ``$'' expansion the GsFile
	primitives apply.

	dir_fd is refused, as os.stat refuses it: resolving the path against the
	wrong directory would open a different file."

	| path flags mode fd |
	path := self ___requiredArgument: 'path' at: 1 in: positional kw: kwargs for: 'open'.
	flags := self ___requiredArgument: 'flags' at: 2 in: positional kw: kwargs for: 'open'.
	mode := positional @env0:size @env0:>= 3
		ifTrue: [positional @env0:at: 3]
		ifFalse: [(kwargs isNil) ifTrue: [8r777] ifFalse: [kwargs @env0:at: 'mode' ifAbsent: [8r777]]].
	(kwargs notNil and: [(kwargs @env0:at: 'dir_fd' ifAbsent: [None]) ~~ None])
		ifTrue: [^ NotImplementedError ___signal___: (self @env0:class ___dirFdUnavailableMessage: 'open')].
	flags := self ___asCInt: flags.
	mode := self ___asCInt: mode.
	fd := self ___libc: #open
		with: { self ___cPathFor: path. flags. #'int32'. mode }
		ifFail: [:errno | ^ self ___signalErrno: errno filename: (self ___fsPath___: path)].
	self @env0:class ___openFds @env0:add: fd.
	^ fd
%

category: 'Grail-File Descriptors'
method: os
close: fd
	"os.close(fd).  The descriptor is forgotten BEFORE close(2) runs: on an
	error (even EINTR) Linux has already released it, so keeping it would let a
	later os.open's reuse of the number be refused."

	| n |
	n := self ___fd: fd.
	self @env0:class ___openFds @env0:remove: n.
	self ___libc: #close with: { n }.
	^ None
%

category: 'Grail-File Descriptors'
method: os
read: fd _: size
	"os.read(fd, n) -- at most n bytes, and b'' at end of file.  A negative n
	is EINVAL, as in CPython 3.14."

	| n count buffer got |
	n := self ___fd: fd.
	count := size ___asIndex___.
	count @env0:< 0 ifTrue: [^ self ___signalErrno: 22].
	buffer := CByteArray @env0:gcMalloc: (count @env0:max: 1).
	got := self ___libc: #read with: { n. buffer. count }.
	got @env0:= 0 ifTrue: [^ ByteArray @env0:new].
	^ buffer @env0:byteArrayFrom: 0 numBytes: got
%

category: 'Grail-File Descriptors'
method: os
readinto: fd _: aBuffer
	"os.readinto(fd, buffer) -- read into a writable buffer (a bytearray, or a
	memoryview over one), answering how many bytes arrived.  _pyio.FileIO reads
	this way, into a memoryview SLICE of its result, so the bytes land at the
	view's own offset in the source."

	| n window target offset length buffer got |
	n := self ___fd: fd.
	window := self ___writableWindowOf: aBuffer.
	target := window @env0:at: 1.
	offset := window @env0:at: 2.
	length := window @env0:at: 3.
	buffer := CByteArray @env0:gcMalloc: (length @env0:max: 1).
	got := self ___libc: #read with: { n. buffer. length }.
	got @env0:> 0 ifTrue: [
		target @env0:replaceFrom: offset @env0:+ 1
			to: offset @env0:+ got
			with: (buffer @env0:byteArrayFrom: 0 numBytes: got)
			startingAt: 1].
	^ got
%

category: 'Grail-File Descriptors'
method: os
___writableWindowOf: aBuffer
	"{ bytes. offset. length } -- where a read into aBuffer must write."

	(aBuffer @env0:isKindOf: memoryview) ifTrue: [^ aBuffer ___writableWindow___].
	(aBuffer @env0:isKindOf: bytearray) ifTrue: [^ { aBuffer. 0. aBuffer @env0:size }].
	^ TypeError ___signal___:
		('readinto() argument 2 must be read-write bytes-like object, not '
			@env0:, (bytes ___pyTypeNameOf___: aBuffer))
%

category: 'Grail-File Descriptors'
method: os
write: fd _: data
	"os.write(fd, data) -- one write(2), answering how many bytes it took."

	| n contents |
	n := self ___fd: fd.
	contents := (data @env0:isKindOf: memoryview)
		ifTrue: [data tobytes]
		ifFalse: [data].
	(contents @env0:isKindOf: ByteArray) ifFalse: [
		^ TypeError ___signal___:
			('a bytes-like object is required, not '''
				@env0:, (bytes ___pyTypeNameOf___: data) @env0:, '''')].
	contents @env0:isEmpty ifTrue: [^ self ___libc: #write with: { n. nil. 0 }].
	^ self ___libc: #write
		with: { n. CByteArray @env0:withAll: contents nullTerminate: false. contents @env0:size }
%

category: 'Grail-File Descriptors'
method: os
lseek: fd _: position _: how
	"os.lseek(fd, pos, how) -- answering the new offset from the start."

	| n pos |
	n := self ___fd: fd.
	pos := position ___asIndex___.
	(pos @env0:between: -9223372036854775808 and: 9223372036854775807) ifFalse: [
		^ OverflowError ___signal___: 'Python int too large to convert to C long'].
	^ self ___libc: #lseek with: { n. pos. self ___asCInt: how }
%

category: 'Grail-File Descriptors'
method: os
fstat: fd
	"os.fstat(fd) -- the kernel's own fstat primitive, which answers the same
	GsFileStat os.stat wraps, so the two agree field for field."

	| n result |
	n := self ___fd: fd.
	result := GsFile @env0:_fstat: n isLstat: false.
	(result @env0:isKindOf: GsFileStat) ifTrue: [^ PyStatResult @env0:on: result].
	(result @env0:isKindOf: SmallInteger) ifTrue: [^ self ___signalErrno: result].
	^ self ___signalErrno: 9
%

category: 'Grail-File Descriptors'
method: os
ftruncate: fd _: length
	"os.ftruncate(fd, length)."

	| n size |
	n := self ___fd: fd.
	size := length ___asIndex___.
	self ___libc: #ftruncate with: { n. size }.
	^ None
%

category: 'Grail-File Descriptors'
method: os
isatty: fd
	"os.isatty(fd) -- never raises: CPython answers False for a descriptor that
	is not open, and so for one that is not Grail's."

	| n |
	n := [self ___asCInt: fd] @env0:on: OverflowError do: [:ex | ex @env0:return: nil].
	n isNil ifTrue: [^ false].
	(self @env0:class ___openFds @env0:includes: n) ifFalse: [^ false].
	^ ((self @env0:class ___fdCallouts @env0:at: #isatty) @env0:callWith: { n }) @env0:= 1
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
	result := os_Environ @env0:___envRawGet___: name.
	result == nil ifTrue: [^ default].
	^ result
%

category: 'Grail-Environment Variables'
method: os
putenv: name _: value
	"os.putenv(name, value) — set environment variable."

	os_Environ @env0:___envRawPut___: name value: value.
	^ None
%

category: 'Grail-Environment Variables'
method: os
unsetenv: name
	"os.unsetenv(name) — remove an environment variable.  GemStone has no
	true ``remove'' for a gem environment variable, so clear it to nil
	(falling back to an empty string if the platform rejects nil).  numpy's
	_core init relies on this to undo a transient OPENBLAS_MAIN_FREE putenv."

	os_Environ @env0:___envRawRemove___: name.
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
! os_Environ — the long-value overlay
!
! ``System class >> gemEnvironmentVariable:put:'' refuses a value past some
! length with OutOfRange (error 2061), signalled from the GsFile user action
! underneath it.  Because that comes from a user action it is UNCATCHABLE by
! Python, so it escaped as a Smalltalk error rather than any exception a test
! could handle.
!
! THE LENGTH IS PLATFORM-SPECIFIC, which is why nothing here hardcodes it:
! Darwin arm64 takes 1023 and refuses 1024, while Linux x86_64 accepts 1024 --
! CI found that, on a build where a hardcoded 1023 had looked portable.  So the
! write path simply TRIES the real environment and falls back only when this
! platform actually refuses, which needs no constant and cannot go stale.
!
! CPython has no limit at all -- measured on 3.14: a 100,000 character value
! round-trips through os.environ and a child process inherits it.
!
! That is not hypothetical: test.test_urllib2_localnet's setUp writes the
! environment back, and on a developer machine whose PATH is long the write
! died there.  CI never saw it because a container PATH is short, so the row
! read one failure worse locally and looked like a platform difference.
!
! So values too long for the C environment are kept in a SESSION-LOCAL overlay
! and every read consults it first.  The value round-trips EXACTLY, which is
! the CPython-visible contract; truncating instead would read back something
! other than what was stored, silently, and that is worse than the limit.
!
! What this deliberately does NOT do is make a long value visible to a child
! process that inherits the gem's C environment -- it physically cannot be
! there.  Grail's own subprocess support builds an explicit env block from
! os.environ, so it sees the overlay; a bare inherited environment does not.
! ===============================================================================

category: 'Grail-Env Overlay'
classmethod: os_Environ
___envOverlay___
	"Names whose value is too long for the C environment, session-local
	because a gem's environment is session-local anyway."

	| t d |
	t := SessionTemps current.
	d := t at: #'___grailEnvOverlay___' otherwise: nil.
	d == nil ifTrue: [
		d := Dictionary new.
		t at: #'___grailEnvOverlay___' put: d].
	^ d
%

category: 'Grail-Env Overlay'
classmethod: os_Environ
___envRawGet___: aName
	"The one read path: overlay first, then the C environment.  Answers nil
	when unset, exactly as gemEnvironmentVariable: does."

	| s |
	s := aName asString.
	^ self ___envOverlay___
		at: s
		ifAbsent: [System gemEnvironmentVariable: s]
%

category: 'Grail-Env Overlay'
classmethod: os_Environ
___envRawPut___: aName value: aValue
	"The one write path.  TRY the real environment first: when it takes the
	value that is where it lives (and any stale overlay entry is dropped, so a
	short write always wins over an earlier long one).  Only when THIS platform
	refuses does the value go to the overlay, which is what keeps os.environ
	from raising where CPython would not.

	Trying rather than testing a length is deliberate.  The cap is
	platform-specific -- Darwin arm64 refuses 1024, Linux x86_64 accepts it --
	so any constant here is wrong somewhere, and wrong in the silent direction:
	too low and values needlessly leave the real environment (a child process
	stops seeing them), too high and the uncatchable error comes back.  Asking
	the platform cannot go stale.

	Only OutOfRange -- the refusal this exists for -- is absorbed.  Anything
	else is passed, so a genuinely bad write still fails loudly instead of
	being quietly parked in the overlay."

	| s v |
	s := aName asString.
	v := aValue asString.
	^ [System gemEnvironmentVariable: s put: v.
	   self ___envOverlay___ removeKey: s ifAbsent: [].
	   v]
		on: Error
		do: [:ex |
			"AlmostOutOfStackError is an Error subclass; never eat the VM's
			warning or the next overflow is a fatal Red Zone crash."
			(ex isKindOf: AlmostOutOfStackError) ifTrue: [ex pass].
			(ex isKindOf: OutOfRange) ifFalse: [ex pass].
			self ___envOverlay___ at: s put: v.
			ex return: v]
%

category: 'Grail-Env Overlay'
classmethod: os_Environ
___envRawRemove___: aName
	"Unset in both homes.  GemStone has no true remove, so the C side is
	cleared to nil, falling back to an empty string where that is rejected."

	| s |
	s := aName asString.
	self ___envOverlay___ removeKey: s ifAbsent: [].
	[System gemEnvironmentVariable: s put: nil]
		on: AbstractException
		do: [:ex |
			"AlmostOutOfStackError is an Error subclass; never eat the VM's
			warning or the next overflow is a fatal Red Zone crash."
			(ex isKindOf: AlmostOutOfStackError) ifTrue: [ex pass].
			System gemEnvironmentVariable: s put: ''].
%

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
	v := os_Environ ___envRawGet___: (key asString).
	v == nil ifTrue: [^ default].
	self @env1:___note___: key.
	^ v
%

category: 'Grail-Env0 Dictionary Protocol'
method: os_Environ
at: key ifAbsent: aBlock
	| v |
	v := os_Environ ___envRawGet___: (key asString).
	v == nil ifTrue: [^ aBlock value].
	self @env1:___note___: key.
	^ v
%

category: 'Grail-Env0 Dictionary Protocol'
method: os_Environ
at: key
	| v |
	v := os_Environ ___envRawGet___: (key asString).
	v == nil ifTrue: [^ self error: 'key not found: ' , key asString].
	self @env1:___note___: key.
	^ v
%

category: 'Grail-Env0 Dictionary Protocol'
method: os_Environ
at: key put: value
	os_Environ ___envRawPut___: (key asString) value: (value asString).
	self @env1:___note___: key.
	^ value
%

category: 'Grail-Env0 Dictionary Protocol'
method: os_Environ
includesKey: key
	^ (os_Environ ___envRawGet___: (key asString)) ~~ nil
%
