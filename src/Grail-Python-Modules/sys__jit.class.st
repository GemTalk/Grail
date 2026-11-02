"
Python sys._jit -- CPython 3.14's module for observing just-in-time
compilation (Python/sysmodule.c:4098-4226).  Grail compiles Python to
GemStone methods ahead of running them and has no tier-2 JIT, so it answers
what a CPython built without one does: is_available, is_enabled and is_active
are all False.
"
Class {
	#name : 'sys__jit',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}
