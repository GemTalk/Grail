! ------------------- Superclass check
run
NativeModule ifNil: [self error: 'NativeModule is not defined. Check file ordering.'].
%

! ------- os_path class (Python 'os.path' module)
expectvalue /Class
doit
NativeModule subclass: 'os_path'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
os_path comment:
'Python os.path module.

Provides common pathname manipulations.
See https://docs.python.org/3/library/os.path.html
'
%

expectvalue /Class
doit
os_path category: 'Grail-Modules'
%

! ------------------- Remove existing Python methods from os_path
expectvalue /Metaclass3
doit
os_path removeAllMethods: 1.
os_path class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
method: os_path
initialize
	"Module-level constants matching CPython's posixpath:
	  altsep — alternative separator (None on POSIX, '/' on Windows
	    when sep is '\\'); Grail assumes posix so this is None.
	  sep — primary separator '/'.
	  pathsep — list-separator ':' for PATH-style env vars.
	  extsep — file extension delimiter '.'.
	  defpath — default search path for execvpe.
	  devnull — '/dev/null' on POSIX.
	  supports_unicode_filenames — whether the filesystem is known to accept
	    arbitrary Unicode names.  NOT a constant: CPython's posixpath says
	    ``supports_unicode_filenames = (sys.platform == 'darwin')'', so it is
	    True on macOS and False on Linux, and the same test is made here off
	    the same GemStone osName that sys.platform itself is derived from.
	    Hardcoding either value would be right on one platform and wrong on
	    the other, and Grail runs on both.
	    test_sax reads it at import time to decide whether to run its
	    non-ascii-filename cases, and an ABSENT attribute is not the same as
	    a False one -- it raised AttributeError and took the whole module
	    down with it.
	Werkzeug.utils.secure_filename iterates ``os.sep, os.path.altsep''
	to strip path separators from uploaded filenames."

	self @env0:dynamicInstVarAt: #supports_unicode_filenames
		put: ((System @env0:gemVersionAt: #osName) @env0:= 'Darwin').
	self @env0:dynamicInstVarAt: #altsep put: None.
	self @env0:dynamicInstVarAt: #sep put: '/'.
	self @env0:dynamicInstVarAt: #curdir put: '.'.
	self @env0:dynamicInstVarAt: #pardir put: '..'.
	self @env0:dynamicInstVarAt: #pathsep put: ':'.
	self @env0:dynamicInstVarAt: #extsep put: '.'.
	self @env0:dynamicInstVarAt: #defpath put: '/bin:/usr/bin'.
	self @env0:dynamicInstVarAt: #devnull put: '/dev/null'
%

! ===============================================================================
! Fast-path callables — path manipulation
! ===============================================================================

category: 'Grail-Path Manipulation'
method: os_path
join: paths
	"os.path.join(path) — 1-arg form.  Python's os.path.join is
	variadic; this entry matches the ``join(arg)'' call shape and
	just returns the arg if it's a single path string, or joins
	the elements when called with a list/tuple.  Variadic calls
	``join(a, b, c)'' go through ``_join:kw:'' (2+ positional args)."

	((paths isKindOf: CharacterCollection)) ifTrue: [^ paths].
	^ self ___joinComponents___: paths
%

category: 'Grail-Path Manipulation'
method: os_path
join: aPath _: anotherPath
	"os.path.join(a, b) — 2-arg fast path.  Joins two path strings
	with the standard separator semantics: if ``anotherPath''
	starts with ``/'' it replaces ``aPath''; if ``aPath'' ends with
	``/'' the separator isn't doubled."

	^ self ___joinComponents___: (Array @env0:with: aPath with: anotherPath)
%

category: 'Grail-Path Manipulation'
method: os_path
_join: positional kw: kwargs
	"os.path.join(a, b, c, ...) — varargs form.  Python's join
	walks the positional args left-to-right.  Empty call is the
	empty string."

	^ self ___joinComponents___: positional
%

category: 'Grail-Path Manipulation'
method: os_path
___joinComponents___: somedPaths
	"Internal helper — apply Python's os.path.join semantics over
	an indexable collection of path strings.  Empty → ''; absolute
	component restarts; trailing separator avoids doubling.

	Every join spelling (1-arg, 2-arg, varargs) funnels through here, so
	coercing PathLike components once covers all of them — and
	``join(Path(dir), name)'' is the single most common way a Path reaches
	os.path at all."

	| result sep size paths |
	paths := somedPaths @env0:collect: [:p | (os instance) ___fsPath___: p].
	(paths @env0:isEmpty) ifTrue: [^ ''].
	((paths @env0:size) == 1) ifTrue: [^ paths @env0:first].
	sep := '/'.
	result := paths @env0:first.
	size := paths @env0:size.
	2 @env0:to: size do: [:i |
		| each |
		each := paths @env0:at: i.
		(each @env0:beginsWith: sep) ifTrue: [
			result := each
		] ifFalse: [
			"``result isEmpty'' is the arm that was missing.  CPython's rule is
			``elif not path or path.endswith(sep)'' -- an EMPTY accumulator
			takes the component as-is, because there is nothing to separate it
			from.  Without it join('', 'a') answered '/a', turning a RELATIVE
			path into an ABSOLUTE one, and join('', '', '') answered '/'
			instead of ''.

			Found through importlib.util >> cache_from_source, whose first
			component is the empty dirname of a bare filename: it answered
			'/__pycache__/x.pyc' for 'x.py'."
			(result @env0:isEmpty @env0:or: [result @env0:endsWith: sep]) ifTrue: [
				result := result @env0:, each
			] ifFalse: [
				result := (result @env0:, sep) @env0:, each
			]
		]
	].
	^ result
%

category: 'Grail-Path Manipulation'
method: os_path
normcase: aPath
	"POSIX normcase is the identity (case is significant) — but it still has
	to answer a STRING for a PathLike argument, as CPython's does."

	^ (os instance) ___fsPath___: aPath
%

category: 'Grail-Path Manipulation'
method: os_path
realpath: path
	"CPython's own posixpath.realpath, which Grail already ships and which
	already works here: pathlib imports posixpath, so the module is in the
	tree and exercised.  This answered ``abspath'' instead -- no link
	resolved at all -- which is what Path.resolve() inherited.

	DELEGATED rather than rewritten.  Resolving is not one readlink: it is a
	component-by-component walk that re-resolves each link against the
	directory holding it, unwinds ``..'' AFTER following, and has to notice a
	symlink LOOP and answer differently for strict.  A second copy of that
	algorithm beside the one in the tree would be a second thing to get
	wrong."

	^ self ___posixpathModule @env1:realpath: path
%

category: 'Grail-Path Predicates'
method: os_path
ismount: path
	"os.path.ismount(path) -- CPython's own, which compares the path's device
	and inode against its parent's.  Path.is_mount() is this call, and there is
	no primitive to shortcut it with: what it needs is os.lstat, os.fspath and
	realpath, all of which Grail has."

	^ self ___posixpathModule @env1:ismount: path
%

category: 'Grail-Path Predicates'
method: os_path
isjunction: path
	"os.path.isjunction(path) -- FALSE everywhere off Windows, which is what
	CPython answers here too, after coercing the argument.  Path.is_junction()
	is this call.  posixpath re-exports genericpath's, so the coercion (and so
	the TypeError for a non-path) is CPython's rather than a bare ``^ false''."

	^ self ___posixpathModule @env1:isjunction: path
%

category: 'Grail-Path Manipulation'
method: os_path
relpath: path
	"os.path.relpath(path, start=os.curdir) -- CPython's own.  Missing
	entirely before, and it is not a shortening of abspath: the two paths are
	split, their common prefix dropped, and one ``..'' emitted per remaining
	component of start."

	^ self ___posixpathModule @env1:relpath: path
%

category: 'Grail-Path Manipulation'
method: os_path
relpath: path _: start

	^ self ___posixpathModule @env1:relpath: path _: start
%

category: 'Grail-Path Manipulation'
method: os_path
___posixpathModule
	"CPython's posixpath.  A Grail import is a database read, and sys.modules
	caches it per session, so asking each time costs a dictionary lookup
	after the first."

	^ (importlib @env0:___instance___) @env1:import_module: 'posixpath'
%

category: 'Grail-Path Manipulation'
method: os_path
_realpath: positional kw: kwargs
	"os.path.realpath(filename, *, strict=False), for a call that passes a
	keyword.  CPython's pathlib resolves with ``os.path.realpath(self,
	strict=strict)'', so without this Path.resolve() matched no selector --
	and resolve() is the one call there the old hand-written pathlib had.

	strict is posixpath's own now, not a stat bolted on afterwards.  That
	matters for a symlink LOOP, which is an OSError carrying ELOOP rather
	than the FileNotFoundError a re-stat would have produced, and for a
	missing component in the MIDDLE of the path."

	| filename |

	filename := (os instance) ___requiredArgument: 'filename' at: 1 in: positional kw: kwargs for: 'realpath'.
	(self ___isStrict: kwargs) ifFalse: [^ self realpath: filename].
	^ self ___posixpathModule @env1:_realpath: { filename } kw: self ___strictKeyword
%

category: 'Grail-Path Manipulation'
method: os_path
___strictKeyword

	^ Dictionary @env0:new @env0:at: 'strict' put: true; @env0:yourself
%

category: 'Grail-Path Manipulation'
method: os_path
___isStrict: kwargs

	^ kwargs notNil and: [(kwargs @env0:at: 'strict' ifAbsent: [false]) ___isTruthy___]
%

category: 'Grail-Path Manipulation'
method: os_path
expanduser: aPath
	"~ expansion via the HOME environment variable."

	| home path |
	path := (os instance) ___fsPath___: aPath.
	(path @env0:size @env0:> 0 and: [(path @env0:at: 1) @env0:= $~]) ifFalse: [^ path].
	home := System @env0:gemEnvironmentVariable: 'HOME'.
	home @env0:isNil ifTrue: [^ path].
	path @env0:size @env0:= 1 ifTrue: [^ home].
	^ home @env0:, (path @env0:copyFrom: 2 to: path @env0:size)
%

category: 'Grail-Path Manipulation'
method: os_path
basename: aPath
	"os.path.basename(path) -- CPython's posixpath.basename: everything after the
	LAST slash, so a trailing slash yields ''.  The previous version stripped one
	trailing slash first (basename('a/') was 'a') and answered '/' for ''."

	| p |
	p := self ___plainPathString___: aPath.
	p @env0:isNil ifTrue: [^ self ___posixpathModule @env1:basename: aPath].
	^ p @env0:copyFrom: (self ___lastSlashIn___: p) @env0:+ 1 to: p @env0:size
%

category: 'Grail-Path Manipulation'
method: os_path
dirname: aPath
	"os.path.dirname(path) -- CPython's posixpath.dirname: everything up to the
	LAST slash, with trailing slashes stripped unless the head is ONLY slashes
	(so '//a' keeps '//').  A name with no slash has the dirname '' -- not '.',
	which is what this answered before.  SimpleHTTPRequestHandler.translate_path
	skips any component with a truthy dirname, so under '.' it skipped every
	one and served the root directory for every URL."

	| p |
	p := self ___plainPathString___: aPath.
	p @env0:isNil ifTrue: [^ self ___posixpathModule @env1:dirname: aPath].
	^ self ___headOf___: p upTo: (self ___lastSlashIn___: p)
%

category: 'Grail-Path Manipulation'
method: os_path
split: aPath
	"os.path.split(path) -- (dirname, basename), as CPython computes them, so
	``head + sep + tail'' round-trips.  split('/a') was ('', 'a') before, and a
	doubled slash was dropped from the head."

	| p i |
	p := self ___plainPathString___: aPath.
	p @env0:isNil ifTrue: [^ self ___posixpathModule @env1:split: aPath].
	i := self ___lastSlashIn___: p.
	^ tuple @env0:with: (self ___headOf___: p upTo: i)
		with: (p @env0:copyFrom: i @env0:+ 1 to: p @env0:size)
%

category: 'Grail-Path Manipulation'
method: os_path
splitext: aPath
	"os.path.splitext(path) -- genericpath._splitext.  The extension starts at
	the last dot of the last component, unless everything before that dot in
	the component is also dots: '.b' and '..b' have no extension.  A trailing
	dot IS one ('a.' is ('a', '.')), and a dotfile in a subdirectory
	('a/.b') has none -- the version this replaces had both of those backwards."

	| p sepIndex dotIndex i |
	p := self ___plainPathString___: aPath.
	p @env0:isNil ifTrue: [^ self ___posixpathModule @env1:splitext: aPath].
	sepIndex := self ___lastSlashIn___: p.
	dotIndex := self ___lastIndexOf___: $. in: p.
	dotIndex @env0:> sepIndex ifTrue: [
		i := sepIndex @env0:+ 1.
		[i @env0:< dotIndex] @env0:whileTrue: [
			(p @env0:at: i) @env0:= $. ifFalse: [
				^ tuple @env0:with: (p @env0:copyFrom: 1 to: dotIndex @env0:- 1)
					with: (p @env0:copyFrom: dotIndex to: p @env0:size)].
			i := i @env0:+ 1]].
	^ tuple @env0:with: p with: (p @env0:copyFrom: 1 to: 0)
%

category: 'Grail-Path Manipulation'
method: os_path
splitdrive: aPath
	"os.path.splitdrive(path) -- POSIX has no drives, so the drive is always empty."

	^ tuple @env0:with: '' with: ((os instance) ___fsPath___: aPath)
%

category: 'Grail-Path Manipulation'
method: os_path
splitroot: aPath
	"os.path.splitroot(path) -- (drive, root, tail).  Exactly two leading slashes
	are a root of their own: POSIX leaves a leading ``//'' implementation-defined,
	and CPython keeps it rather than collapsing it to ``/''."

	| path |

	path := (os instance) ___fsPath___: aPath.
	(path @env0:beginsWith: '/') ifFalse: [^ tuple @env0:with: '' with: '' with: path].
	(self ___hasExactlyTwoLeadingSlashes___: path)
		ifTrue: [^ tuple @env0:with: '' with: '//' with: (path @env0:copyFrom: 3 to: path @env0:size)].
	^ tuple @env0:with: '' with: '/' with: (path @env0:copyFrom: 2 to: path @env0:size)
%

category: 'Grail-Path Manipulation'
method: os_path
___hasExactlyTwoLeadingSlashes___: aPath
	"CPython's test, for a path already known to start with a slash:
	``p[1:2] == sep and p[2:3] != sep''."

	^ (aPath @env0:size @env0:>= 2 and: [(aPath @env0:at: 2) @env0:= $/])
		and: [aPath @env0:size @env0:= 2 or: [(aPath @env0:at: 3) @env0:~= $/]]
%

category: 'Grail-Path Manipulation'
method: os_path
samefile: aPath _: anotherPath
	"os.path.samefile(path1, path2) -- the same inode on the same device, as
	CPython's samestat decides it."

	^ (self ___fileIdentityOf___: aPath) @env0:= (self ___fileIdentityOf___: anotherPath)
%

category: 'Grail-Path Manipulation'
method: os_path
___fileIdentityOf___: aPath
	"The (st_dev, st_ino) pair that makes two paths name the same file."

	| status |

	status := (os instance) stat: aPath.
	^ Array
		@env0:with: (status @env1:___pyAttrLoad___: #'st_dev')
		with: (status @env1:___pyAttrLoad___: #'st_ino')
%

category: 'Grail-Path Manipulation'
method: os_path
isabs: aPath
	"os.path.isabs(path) — True if path is absolute."

	^ ((os instance) ___fsPath___: aPath) @env0:beginsWith: '/'
%

category: 'Grail-Path Manipulation'
method: os_path
getmtime: path
	"os.path.getmtime(path) — last-modification time in seconds since the epoch.
	Delegates to os, like the other filesystem queries here."

	^ (os instance) getmtime: path
%

category: 'Grail-Path Manipulation'
method: os_path
normpath: aPath
	"os.path.normpath(path) -- CPython's posixpath.normpath, component by
	component.  EXACTLY two leading slashes survive (POSIX leaves '//'
	implementation-defined, so CPython keeps it); one or three-plus collapse to
	one.  A leading '..' survives only in a RELATIVE path.  The previous version
	collapsed '//a' to '/a' along with the rest."

	| p initialSlashes comps newComps out |
	p := self ___plainPathString___: aPath.
	p @env0:isNil ifTrue: [^ self ___posixpathModule @env1:normpath: aPath].
	p @env0:isEmpty ifTrue: [^ '.'].
	initialSlashes := 0.
	(p @env0:at: 1) @env0:= $/ ifTrue: [
		initialSlashes := (self ___hasExactlyTwoLeadingSlashes___: p)
			ifTrue: [2] ifFalse: [1]].
	comps := OrderedCollection @env0:new.
	self ___componentsOf___: p do: [:c | comps @env0:add: c].
	newComps := OrderedCollection @env0:new.
	comps @env0:do: [:comp |
		(comp @env0:isEmpty or: [comp @env0:= '.']) ifFalse: [
			((comp @env0:= '..') @env0:not
				or: [(initialSlashes @env0:= 0 and: [newComps @env0:isEmpty])
				or: [newComps @env0:notEmpty and: [newComps @env0:last @env0:= '..']]])
				ifTrue: [newComps @env0:add: comp]
				ifFalse: [newComps @env0:notEmpty ifTrue: [newComps @env0:removeLast]]]].
	out := p @env0:copyFrom: 1 to: 0.
	initialSlashes @env0:timesRepeat: [out := out @env0:, '/'].
	newComps @env0:doWithIndex: [:comp :k |
		k @env0:> 1 ifTrue: [out := out @env0:, '/'].
		out := out @env0:, comp].
	^ out @env0:isEmpty ifTrue: ['.'] ifFalse: [out]
%

category: 'Grail-Path Manipulation'
method: os_path
___plainPathString___: aPath
	"aPath reduced by os.fspath, when the result is a plain Smalltalk string the
	ports here can scan; nil for bytes or a str holding lone surrogates, both of
	which CPython's own posixpath handles instead.  Strict, as CPython is: a
	non-path is os.fspath's TypeError, not a pass-through.  The ports stay in
	Smalltalk because the Python originals measured 5-17 times slower, and
	these are called in loops."

	| p |
	p := (os instance) fspath: aPath.
	^ (p @env0:isKindOf: CharacterCollection) ifTrue: [p] ifFalse: [nil]
%

category: 'Grail-Path Manipulation'
method: os_path
___lastSlashIn___: p
	"The 1-based index of the last $/ in p, 0 when there is none -- CPython's
	``p.rfind(sep) + 1''."

	^ self ___lastIndexOf___: $/ in: p
%

category: 'Grail-Path Manipulation'
method: os_path
___lastIndexOf___: aCharacter in: p
	| i |
	i := p @env0:size.
	[i @env0:> 0] @env0:whileTrue: [
		(p @env0:at: i) @env0:= aCharacter ifTrue: [^ i].
		i := i @env0:- 1].
	^ 0
%

category: 'Grail-Path Manipulation'
method: os_path
___headOf___: p upTo: i
	"``head = p[:i]; if head and head != sep*len(head): head = head.rstrip(sep)''
	-- the head posixpath's dirname and split share."

	| end |
	end := i.
	[end @env0:> 0 and: [(p @env0:at: end) @env0:= $/]] @env0:whileTrue: [end := end @env0:- 1].
	"All slashes (or empty): kept whole."
	end @env0:= 0 ifTrue: [^ p @env0:copyFrom: 1 to: i].
	^ p @env0:copyFrom: 1 to: end
%

category: 'Grail-Path Manipulation'
method: os_path
___componentsOf___: p do: aBlock
	"``p.split('/')'', empty fields included, one block call per field."

	| start |
	start := 1.
	1 @env0:to: p @env0:size do: [:i |
		(p @env0:at: i) @env0:= $/ ifTrue: [
			aBlock @env0:value: (p @env0:copyFrom: start to: i @env0:- 1).
			start := i @env0:+ 1]].
	aBlock @env0:value: (p @env0:copyFrom: start to: p @env0:size)
%

category: 'Grail-Path Manipulation'
method: os_path
abspath: path
	"os.path.abspath(path) — return normalized absolute pathname."

	(self isabs: path) ifTrue: [^ self normpath: path].
	^ self normpath: (self join: {(os instance) getcwd. path})
%

! ===============================================================================
! Fast-path callables — file queries (delegate to os)
! ===============================================================================

category: 'Grail-Path Manipulation'
method: os_path
exists: path
	"os.path.exists(path) — delegates to os.exists."

	^ (os instance) exists: path
%

category: 'Grail-Path Manipulation'
method: os_path
isdir: path
	"os.path.isdir(path) — delegates to os.isdir."

	^ (os instance) isdir: path
%

category: 'Grail-Path Manipulation'
method: os_path
isfile: path
	"os.path.isfile(path) — delegates to os.isfile."

	^ (os instance) isfile: path
%

category: 'Grail-Path Manipulation'
method: os_path
islink: path
	"os.path.islink(path) — true iff path names a symbolic link.

	Unlike isdir/isfile this has no ``os.islink'' counterpart to delegate to,
	because CPython has none either: islink lives on os.path alone.  The
	primitive is os >> ___isLink___:, which lstats rather than stats -- stat
	follows the link and would report the target's type."

	^ (os instance) ___isLink___: path
%

category: 'Grail-Path Manipulation'
method: os_path
lexists: path
	"os.path.lexists(path) -- true when path exists, a BROKEN symbolic link
	included: CPython lstats rather than stats, so the link itself is enough.
	Only OSError and ValueError mean no, as in CPython.  CPython's glob binds
	this in a class body (_StringGlobber.lexists), so without it glob -- and
	pathlib, which imports glob -- could not even be imported."

	^ [(os instance) lstat: path.
		true]
			@env0:on: (OSError @env0:, ValueError)
			do: [:ex | ex @env0:return: false]
%

! ===============================================================================
! Fast-path callables — multi-path operations
! ===============================================================================

category: 'Grail-Path Manipulation'
method: os_path
commonpath: somePaths
	"os.path.commonpath(paths) — longest common sub-path."

	| allParts firstSize minSize commonParts allPartsSize i firstPart allMatch paths |
	paths := somePaths @env0:collect: [:p | (os instance) ___fsPath___: p].
	(paths @env0:isEmpty) ifTrue: [
		ValueError ___signal___: 'commonpath() arg is an empty sequence'
	].
	allParts := list ___new___.
	paths @env0:do: [:p |
		| normalized parts |
		normalized := self normpath: p.
		parts := $/ @env0:split: normalized.
		parts := parts @env0:select: [:each | each @env0:notEmpty].
		allParts append: parts
	].
	firstSize := (allParts @env0:first) @env0:size.
	minSize := allParts @env0:inject: firstSize into: [:min :parts |
		(min @env0:min: (parts @env0:size))
	].
	commonParts := list ___new___.
	allPartsSize := allParts @env0:size.
	i := 1.
	[(i @env0:<= minSize)] @env0:whileTrue: [
		firstPart := (allParts @env0:first) @env0:at: i.
		allMatch := true.
		1 @env0:to: allPartsSize do: [:j |
			| parts |
			parts := allParts @env0:at: j.
			((parts @env0:at: i) @env0:= firstPart) ifFalse: [allMatch := false]
		].
		allMatch ifTrue: [
			commonParts append: firstPart.
			i := i @env0:+ 1
		] ifFalse: [
			(i == 1) ifTrue: [
				ValueError ___signal___: 'Paths do not start from a common point'
			].
			i := minSize @env0:+ 1
		]
	].
	(commonParts @env0:isEmpty) ifTrue: [^ '/'].
	^ '/' @env0:, (commonParts @env0:inject: '' into: [:acc :each |
		(acc @env0:isEmpty) ifTrue: [each] ifFalse: [((acc @env0:, '/') @env0:, each)]
	])
%

category: 'Grail-Path Manipulation'
method: os_path
commonprefix: somePaths
	"os.path.commonprefix(paths) — longest path prefix (char-by-char)."

	| pathsSize minLen prefix i char allMatch paths |
	paths := somePaths @env0:collect: [:p | (os instance) ___fsPath___: p].
	(paths @env0:isEmpty) ifTrue: [^ ''].
	pathsSize := paths @env0:size.
	(pathsSize == 1) ifTrue: [^ paths @env0:first].
	minLen := paths @env0:inject: ((paths @env0:first) @env0:size) into: [:min :p |
		(min @env0:min: (p @env0:size))
	].
	prefix := ''.
	i := 1.
	[(i @env0:<= minLen)] @env0:whileTrue: [
		char := (paths @env0:first) @env0:at: i.
		allMatch := true.
		1 @env0:to: pathsSize do: [:j |
			((((paths @env0:at: j) @env0:at: i) @env0:= char)) ifFalse: [allMatch := false]
		].
		allMatch ifTrue: [
			prefix := prefix @env0:, (char @env0:asString).
			i := i @env0:+ 1
		] ifFalse: [
			i := minLen @env0:+ 1
		]
	].
	^ prefix
%

set compile_env: 0
