Extension { #name : 'os_PathLike' }

{ #category : 'Grail-ABC' }
os_PathLike class >> ___isRegistered___: aClass [
	"Whether aClass, or a superclass of it, was passed to register:."

	^ (self ___registeredClasses___) @env0:anySatisfy: [:registered |
		aClass == registered or: [aClass @env0:inheritsFrom: registered]]

]

{ #category : 'Grail-ABC' }
os_PathLike class >> ___registeredClasses___ [
	"Session-local, like an import is: the registered classes are Python
	classes of this session, and must never be committed into this persistent
	class."

	^ SessionTemps @env0:current
		@env0:at: #'Grail_os_PathLike_registered'
		ifAbsentPut: [IdentitySet @env0:new]

]

{ #category : 'Grail-Filesystem' }
os_PathLike class >> __instancecheck__: instance [
	"Python os.PathLike.__subclasshook__: any object whose type defines
	``__fspath__'' is path-like (duck-typed, PEP 519).  str / bytes do
	NOT define __fspath__, so they are not PathLike — matching CPython.
	Consulted by builtins>>___isInstanceSingle___:of: when the second
	isinstance/issubclass argument is os.PathLike.  Walks the class chain
	(not just the own method dict) so a subclass that inherits __fspath__
	is still recognised."

	^ (instance @env0:class @env0:whichClassIncludesSelector: #'__fspath__' environmentId: 1) notNil
		or: [self ___isRegistered___: instance @env0:class]

]

{ #category : 'Grail-ABC' }
os_PathLike class >> register: aClass [
	"os.PathLike.register(cls) -- ABCMeta's virtual-subclass registration.
	CPython's pathlib calls it at import, ``os.PathLike.register(PurePath)'', so
	without it pathlib could not be imported at all.

	For that call it changes nothing: PurePath defines __fspath__, which the
	structural check above already accepts.  It matters for a class registered
	WITHOUT __fspath__, which CPython then treats as PathLike and so does this.
	Answers aClass, as ABCMeta.register does, so it also works as a decorator."

	(self ___registeredClasses___) @env0:add: aClass.
	^ aClass

]
