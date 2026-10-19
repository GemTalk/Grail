Extension { #name : 'OSError' }

{ #category : 'Grail-Initialization' }
OSError class >> ___allocateForNew: args kw: kwargs [
	"CPython's OSError_new, reached by an explicit ``OSError.__new__(cls, ...)''
	or a subclass's ``super().__new__(cls, ...)'' (BaseException class >>
	___excStaticNew:kw:).

	CPython parses the (errno, strerror, ...) arguments in __new__ and makes
	__init__ a no-op -- EXCEPT for a subclass that overrides __init__ and not
	__new__ (oserror_use_init), which gets empty args here and parses in its
	__init__ instead, so any extra arguments its __init__ takes are not
	misread as an errno.  Keywords are refused only when __new__ parses."

	| inst |
	self ___oserrorUsesInit ifTrue: [
		inst := self ___new___.
		inst ___args___: #().
		^ inst].
	((kwargs @env0:notNil) and: [kwargs @env0:notEmpty]) ifTrue: [
		^ TypeError ___signal___: (self @env0:name @env0:asString
			@env0:, '() takes no keyword arguments')].
	^ super ___allocateForNew: args kw: kwargs

]

{ #category : 'Grail-Initialization' }
OSError class >> ___classesByErrno [
	"CPython's errnomap (Objects/exceptions.c), by NAME, resolved against the
	running platform's numbers -- EAGAIN is 35 on Darwin and 11 on Linux, so a
	table of numbers can only ever be right on one of them.  It used to be
	exactly that, and so mapped only the errnos the two number alike (1..34
	and ECHILD), leaving BlockingIOError, the Connection*Errors and
	TimeoutError to be chosen by hand at each raise site.

	A name this platform does not define (ENOTCAPABLE outside Darwin) maps
	nothing, as CPython's #ifdef has it.  Built once per session."

	| temps map add |
	temps := SessionTemps @env0:current.
	map := temps @env0:at: #'GrailOSErrorClassesByErrno' otherwise: nil.
	map @env0:isNil ifFalse: [^ map].
	map := Dictionary @env0:new.
	add := [:name :cls | | n |
		n := self ___errnoNamed: name.
		n @env0:isNil ifFalse: [map @env0:at: n put: cls]].
	add @env0:value: 'EAGAIN' value: BlockingIOError.
	add @env0:value: 'EALREADY' value: BlockingIOError.
	add @env0:value: 'EINPROGRESS' value: BlockingIOError.
	add @env0:value: 'EWOULDBLOCK' value: BlockingIOError.
	add @env0:value: 'EPIPE' value: BrokenPipeError.
	add @env0:value: 'ESHUTDOWN' value: BrokenPipeError.
	add @env0:value: 'ECHILD' value: ChildProcessError.
	add @env0:value: 'ECONNABORTED' value: ConnectionAbortedError.
	add @env0:value: 'ECONNREFUSED' value: ConnectionRefusedError.
	add @env0:value: 'ECONNRESET' value: ConnectionResetError.
	add @env0:value: 'EEXIST' value: FileExistsError.
	add @env0:value: 'ENOENT' value: FileNotFoundError.
	add @env0:value: 'EISDIR' value: IsADirectoryError.
	add @env0:value: 'ENOTDIR' value: NotADirectoryError.
	add @env0:value: 'EINTR' value: InterruptedError.
	add @env0:value: 'EACCES' value: PermissionError.
	add @env0:value: 'EPERM' value: PermissionError.
	add @env0:value: 'ENOTCAPABLE' value: PermissionError.
	add @env0:value: 'ESRCH' value: ProcessLookupError.
	add @env0:value: 'ETIMEDOUT' value: TimeoutError.
	temps @env0:at: #'GrailOSErrorClassesByErrno' put: map.
	^ map

]

{ #category : 'Grail-Initialization' }
OSError class >> ___classForArgs___: positional [
	"``OSError(2, 'msg')'' IS a FileNotFoundError in CPython: OSError.__new__
	reads the errno and answers the subclass for it, so ``except
	FileNotFoundError'' catches an error raised as a plain OSError with an
	errno.  Grail answered a plain OSError, and the handler did not fire.

	ONLY FOR OSError ITSELF.  CPython maps in OSError.__new__ and only when
	the class named is OSError exactly -- ``PermissionError(2, 'msg')'' stays
	a PermissionError rather than becoming FileNotFoundError, because a caller
	naming a subclass has already said which one it means.

	Only where an errno was really supplied: the (errno, strerror) form is
	2..5 arguments with an INTEGER first, which is the same test
	___args___: makes before it unpacks them.  ``OSError('just a message')''
	and ``OSError(None, 'msg')'' stay OSError, as they do in CPython."

	| errno |

	self @env0:== OSError ifFalse: [^ self].
	(positional @env0:isNil @env0:or: [positional @env0:size @env0:< 2]) ifTrue: [^ self].
	positional @env0:size @env0:> 5 ifTrue: [^ self].
	errno := positional @env0:at: 1.
	(errno @env0:isKindOf: Integer) ifFalse: [^ self].
	^ self ___classForErrno: errno

]

{ #category : 'Grail-Initialization' }
OSError class >> ___classForErrno: anErrno [
	"The OSError subclass CPython's errnomap answers for anErrno, or OSError
	when it maps none.  os asks this too, so an errno reaching Python names
	the same class however it was raised."

	^ self ___classesByErrno @env0:at: anErrno ifAbsent: [OSError]

]

{ #category : 'Grail-Errno' }
OSError class >> ___errnoNamed: aName [
	"The running platform's number for the errno called aName, or nil when
	this platform has none.  Grail's own raise sites ask this rather than
	writing a number, which is what keeps them right on both platforms."

	| temps byName |
	temps := SessionTemps @env0:current.
	byName := temps @env0:at: #'GrailErrnoByName' otherwise: nil.
	byName @env0:isNil ifTrue: [
		| pairs |
		byName := Dictionary @env0:new.
		pairs := self ___errnoPairsFor___: self ___errnoPlatform.
		1 @env0:to: pairs @env0:size by: 2 do: [:i |
			byName @env0:at: (pairs @env0:at: i) put: (pairs @env0:at: i @env0:+ 1)].
		temps @env0:at: #'GrailErrnoByName' put: byName].
	^ byName @env0:at: aName @env0:asString otherwise: nil

]

{ #category : 'Grail-Errno' }
OSError class >> ___errnoPairsFor___: aPlatform [
	"CPython 3.14.8's errno table for aPlatform ('linux' or 'darwin', as
	sys.platform spells them), as a flat tuple of name, number, name, number.

	Copied from CPython's own errno module on each platform -- macOS arm64,
	and the python:3.14.8-slim Linux image -- in number order, and for a
	number with more than one name the one CPython's errorcode answers comes
	FIRST (EAGAIN before EWOULDBLOCK, and on Linux EDEADLOCK before EDEADLK,
	ENOTSUP before EOPNOTSUPP), so errno.py's first-wins errorcode loop gives
	CPython's answer.  tests/python/errno_platform_tables.py checks both rows
	against CPython on whichever platform it runs.

	The platform is an ARGUMENT so that both rows can be exercised on one
	machine; only the Linux one can be checked against CPython in CI."

	(aPlatform @env0:asString @env0:= 'linux') ifTrue: [^ tuple @env0:withAll: #(
		'EPERM' 1 'ENOENT' 2 'ESRCH' 3 'EINTR' 4 'EIO' 5 'ENXIO' 6 'E2BIG' 7
		'ENOEXEC' 8 'EBADF' 9 'ECHILD' 10 'EAGAIN' 11 'EWOULDBLOCK' 11
		'ENOMEM' 12 'EACCES' 13 'EFAULT' 14 'ENOTBLK' 15 'EBUSY' 16 'EEXIST' 17
		'EXDEV' 18 'ENODEV' 19 'ENOTDIR' 20 'EISDIR' 21 'EINVAL' 22 'ENFILE' 23
		'EMFILE' 24 'ENOTTY' 25 'ETXTBSY' 26 'EFBIG' 27 'ENOSPC' 28 'ESPIPE' 29
		'EROFS' 30 'EMLINK' 31 'EPIPE' 32 'EDOM' 33 'ERANGE' 34 'EDEADLOCK' 35
		'EDEADLK' 35 'ENAMETOOLONG' 36 'ENOLCK' 37 'ENOSYS' 38 'ENOTEMPTY' 39
		'ELOOP' 40 'ENOMSG' 42 'EIDRM' 43 'ECHRNG' 44 'EL2NSYNC' 45 'EL3HLT' 46
		'EL3RST' 47 'ELNRNG' 48 'EUNATCH' 49 'ENOCSI' 50 'EL2HLT' 51 'EBADE' 52
		'EBADR' 53 'EXFULL' 54 'ENOANO' 55 'EBADRQC' 56 'EBADSLT' 57 'EBFONT' 59
		'ENOSTR' 60 'ENODATA' 61 'ETIME' 62 'ENOSR' 63 'ENONET' 64 'ENOPKG' 65
		'EREMOTE' 66 'ENOLINK' 67 'EADV' 68 'ESRMNT' 69 'ECOMM' 70 'EPROTO' 71
		'EMULTIHOP' 72 'EDOTDOT' 73 'EBADMSG' 74 'EOVERFLOW' 75 'ENOTUNIQ' 76
		'EBADFD' 77 'EREMCHG' 78 'ELIBACC' 79 'ELIBBAD' 80 'ELIBSCN' 81
		'ELIBMAX' 82 'ELIBEXEC' 83 'EILSEQ' 84 'ERESTART' 85 'ESTRPIPE' 86
		'EUSERS' 87 'ENOTSOCK' 88 'EDESTADDRREQ' 89 'EMSGSIZE' 90 'EPROTOTYPE' 91
		'ENOPROTOOPT' 92 'EPROTONOSUPPORT' 93 'ESOCKTNOSUPPORT' 94 'ENOTSUP' 95
		'EOPNOTSUPP' 95 'EPFNOSUPPORT' 96 'EAFNOSUPPORT' 97 'EADDRINUSE' 98
		'EADDRNOTAVAIL' 99 'ENETDOWN' 100 'ENETUNREACH' 101 'ENETRESET' 102
		'ECONNABORTED' 103 'ECONNRESET' 104 'ENOBUFS' 105 'EISCONN' 106
		'ENOTCONN' 107 'ESHUTDOWN' 108 'ETOOMANYREFS' 109 'ETIMEDOUT' 110
		'ECONNREFUSED' 111 'EHOSTDOWN' 112 'EHOSTUNREACH' 113 'EALREADY' 114
		'EINPROGRESS' 115 'ESTALE' 116 'EUCLEAN' 117 'ENOTNAM' 118 'ENAVAIL' 119
		'EISNAM' 120 'EREMOTEIO' 121 'EDQUOT' 122 'ENOMEDIUM' 123
		'EMEDIUMTYPE' 124 'ECANCELED' 125 'ENOKEY' 126 'EKEYEXPIRED' 127
		'EKEYREVOKED' 128 'EKEYREJECTED' 129 'EOWNERDEAD' 130
		'ENOTRECOVERABLE' 131 'ERFKILL' 132 'EHWPOISON' 133)].
	^ tuple @env0:withAll: #(
		'EPERM' 1 'ENOENT' 2 'ESRCH' 3 'EINTR' 4 'EIO' 5 'ENXIO' 6 'E2BIG' 7
		'ENOEXEC' 8 'EBADF' 9 'ECHILD' 10 'EDEADLK' 11 'ENOMEM' 12 'EACCES' 13
		'EFAULT' 14 'ENOTBLK' 15 'EBUSY' 16 'EEXIST' 17 'EXDEV' 18 'ENODEV' 19
		'ENOTDIR' 20 'EISDIR' 21 'EINVAL' 22 'ENFILE' 23 'EMFILE' 24 'ENOTTY' 25
		'ETXTBSY' 26 'EFBIG' 27 'ENOSPC' 28 'ESPIPE' 29 'EROFS' 30 'EMLINK' 31
		'EPIPE' 32 'EDOM' 33 'ERANGE' 34 'EAGAIN' 35 'EWOULDBLOCK' 35
		'EINPROGRESS' 36 'EALREADY' 37 'ENOTSOCK' 38 'EDESTADDRREQ' 39
		'EMSGSIZE' 40 'EPROTOTYPE' 41 'ENOPROTOOPT' 42 'EPROTONOSUPPORT' 43
		'ESOCKTNOSUPPORT' 44 'ENOTSUP' 45 'EPFNOSUPPORT' 46 'EAFNOSUPPORT' 47
		'EADDRINUSE' 48 'EADDRNOTAVAIL' 49 'ENETDOWN' 50 'ENETUNREACH' 51
		'ENETRESET' 52 'ECONNABORTED' 53 'ECONNRESET' 54 'ENOBUFS' 55
		'EISCONN' 56 'ENOTCONN' 57 'ESHUTDOWN' 58 'ETOOMANYREFS' 59
		'ETIMEDOUT' 60 'ECONNREFUSED' 61 'ELOOP' 62 'ENAMETOOLONG' 63
		'EHOSTDOWN' 64 'EHOSTUNREACH' 65 'ENOTEMPTY' 66 'EPROCLIM' 67 'EUSERS' 68
		'EDQUOT' 69 'ESTALE' 70 'EREMOTE' 71 'EBADRPC' 72 'ERPCMISMATCH' 73
		'EPROGUNAVAIL' 74 'EPROGMISMATCH' 75 'EPROCUNAVAIL' 76 'ENOLCK' 77
		'ENOSYS' 78 'EFTYPE' 79 'EAUTH' 80 'ENEEDAUTH' 81 'EPWROFF' 82
		'EDEVERR' 83 'EOVERFLOW' 84 'EBADEXEC' 85 'EBADARCH' 86 'ESHLIBVERS' 87
		'EBADMACHO' 88 'ECANCELED' 89 'EIDRM' 90 'ENOMSG' 91 'EILSEQ' 92
		'ENOATTR' 93 'EBADMSG' 94 'EMULTIHOP' 95 'ENODATA' 96 'ENOLINK' 97
		'ENOSR' 98 'ENOSTR' 99 'EPROTO' 100 'ETIME' 101 'EOPNOTSUPP' 102
		'ENOPOLICY' 103 'ENOTRECOVERABLE' 104 'EOWNERDEAD' 105 'EQFULL' 106
		'ENOTCAPABLE' 107)

]

{ #category : 'Grail-Errno' }
OSError class >> ___errnoPlatform [
	"'linux' or 'darwin' -- the only two platforms Grail runs on, and the
	sys.platform spelling, so errno.py can pass sys.platform straight in."

	^ (System @env0:gemVersionAt: #'osName') @env0:= 'Linux'
		ifTrue: ['linux']
		ifFalse: ['darwin']

]

{ #category : 'Grail-Initialization' }
OSError class >> ___oserrorUsesInit [
	"CPython's oserror_use_init: a subclass whose own Python code overrides
	__init__ but not __new__ parses its arguments in __init__."

	^ (self ___pythonClassDefines: #'__init__')
		and: [(self ___pythonClassDefines: #'__new__') not]

]

{ #category : 'Grail-Python Attribute Access' }
OSError >> ___args___: anArray [
	"Normalise args as BaseException does, then ALSO unpack CPython's OSError
	fields from them.  ``anArray'' is a Smalltalk Array of the positional
	constructor arguments (hence @env0:size / @env0:at:)."

	| none put size elem fname f2 |
	anArray @env0:isNil ifTrue: [^ super ___args___: anArray].
	size := anArray @env0:size.
	"Outside 2..5 CPython does no unpacking at all and keeps args whole."
	((size @env0:< 2) @env0:or: [size @env0:> 5]) ifTrue: [
		^ super ___args___: anArray].

	none := ExecBlock @env0:___pyNone___.
	put := [:nm :v | self @env0:dynamicInstVarAt: nm put: v].
	elem := [:i | (size @env0:>= i)
		ifTrue: [ anArray @env0:at: i ] ifFalse: [ none ]].

	put value: #'errno'    value: (elem value: 1).
	put value: #'strerror' value: (elem value: 2).

	"No filename supplied: keep args whole and leave filename/filename2 unset.
	CPython decides both from this one test -- see the header."
	fname := elem value: 3.
	(fname @env0:== none) ifTrue: [^ super ___args___: anArray].

	put value: #'filename' value: fname.
	"args 4 is winerror, which is Windows-only and not exposed here."
	f2 := elem value: 5.
	(f2 @env0:== none) ifFalse: [put value: #'filename2' value: f2].
	^ super ___args___: (anArray @env0:copyFrom: 1 to: 2)

]

{ #category : 'Grail-Initialization' }
OSError >> ___init__: positional kw: kwargs [
	"See ___initIsANoOp: no keyword check either, as CPython's OSError_init
	returns before making one."

	self ___initIsANoOp ifTrue: [^ None].
	^ super ___init__: positional kw: kwargs

]

{ #category : 'Grail-Initialization' }
OSError >> ___initIsANoOp [
	"CPython's OSError_init does nothing unless oserror_use_init holds: the
	arguments were parsed by __new__.  In Grail that matters only when a
	Python class on the chain overrides __new__ -- then ``args'' is what that
	__new__ passed to super().__new__, and the type call's __init__, given the
	CALL's arguments, must not overwrite it.  Without a Python __new__ the
	generated constructor allocates without arguments and relies on __init__
	to store them, which is the same answer CPython's __new__ gives."

	^ self @env0:class ___pythonClassDefines: #'__new__'

]

{ #category : 'Grail-Private' }
OSError >> ___osFieldAt___: aName [
	"The stored value of one unpacked field, or nil when the field was never
	stored.  ``dynamicInstVarAt:'' RAISES for an absent name rather than
	answering nil (the reason BaseException >> __cause__ wraps it the same
	way), and absent is a case this class needs to tell apart from None."

	^ [self @env0:dynamicInstVarAt: aName]
		@env0:on: AbstractException do: [:e | e @env0:return: nil]

]

{ #category : 'Grail-Initialization' }
OSError >> __init__ [
	self ___initIsANoOp ifTrue: [^ None].
	^ super __init__

]

{ #category : 'Grail-Initialization' }
OSError >> __init__: a [
	self ___initIsANoOp ifTrue: [^ None].
	^ super __init__: a

]

{ #category : 'Grail-String Representation' }
OSError >> __str__ [
	"CPython's OSError_str: ``[Errno n] strerror'', extended with ``: filename''
	and `` -> filename2'' when those were supplied, and falling back to
	BaseException's rendering when the (errno, strerror) form was not used.

	Grail inherited BaseException's ``str(self.args)'', which renders a
	two-argument exception as the TUPLE: ``(35, 'Resource temporarily
	unavailable')'' where CPython says ``[Errno 35] Resource temporarily
	unavailable''.  That is the shape of every errno-carrying OSError, so the
	difference surfaced anywhere a caught OSError was printed or compared.

	The filename parts use Python repr, not str -- CPython formats them with
	%R, so the name arrives quoted."

	| e f f2 b stream |
	e := self ___osFieldAt___: #'errno'.
	"Absent, not None: the errno form was not used at all."
	e @env0:isNil ifTrue: [^ super __str__].

	b := builtins instance.
	stream := AppendStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPutAll: '[Errno '.
	stream @env0:nextPutAll: ((str __new__: e) @env0:asString).
	stream @env0:nextPutAll: '] '.
	stream @env0:nextPutAll:
		((str __new__: (self ___osFieldAt___: #'strerror')) @env0:asString).

	f := self ___osFieldAt___: #'filename'.
	f @env0:isNil ifTrue: [^ stream @env0:contents].
	stream @env0:nextPutAll: ': '.
	stream @env0:nextPutAll: ((b repr: f) @env0:asString).

	f2 := self ___osFieldAt___: #'filename2'.
	f2 @env0:isNil ifTrue: [^ stream @env0:contents].
	stream @env0:nextPutAll: ' -> '.
	stream @env0:nextPutAll: ((b repr: f2) @env0:asString).
	^ stream @env0:contents

]

{ #category : 'Grail-Python Attribute Access' }
OSError >> errno [
	"None when the constructor was not given CPython's (errno, strerror) form.

	THE DEFAULT IS THE POINT, and it was missing.  The four fields are stored
	as dynamic instVars only when they are supplied, and ___pyAttrLoad___
	probes dynamic instVars BEFORE methods, so this accessor runs exactly in
	the case that used to raise AttributeError.

	It is not a rare case: every OSError Grail's socket layer raises is the
	ONE-argument form (``[Errno 9] Bad file descriptor'' as a single message
	string), so ``except OSError as e:'' followed by ``e.errno in (EAGAIN,
	EWOULDBLOCK)'' -- which is how the VENDORED CPython socket.py decides that
	a non-blocking read should be retried rather than reported -- could not run
	at all.  It raised AttributeError from inside the handler."

	^ (self ___osFieldAt___: #'errno') @env0:ifNil: [None]

]

{ #category : 'Grail-Python Attribute Access' }
OSError >> filename [
	"None when not supplied; see ``errno''."

	^ (self ___osFieldAt___: #'filename') @env0:ifNil: [None]

]

{ #category : 'Grail-Python Attribute Access' }
OSError >> filename2 [
	"None when not supplied; see ``errno''."

	^ (self ___osFieldAt___: #'filename2') @env0:ifNil: [None]

]

{ #category : 'Grail-Python Attribute Access' }
OSError >> strerror [
	"None when not supplied; see ``errno''."

	^ (self ___osFieldAt___: #'strerror') @env0:ifNil: [None]

]
