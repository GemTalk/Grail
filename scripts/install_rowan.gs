! ===============================================================================
! Grail installation through Rowan -- the counterpart of src/smalltalk/install.gs.
!   file  scripts/install_rowan.gs   (run by install.sh when GRAIL_INSTALL=rowan)
! Needs an extent with Rowan masterV4 7d50ec0c8 or later (shadowsGlobals, unicodeSource,
! gs_superclassDictionary, per-user session-method extensions of kernel classes).
! ===============================================================================
! Rowan loads the Grail project (rowan/specs/Grail.ston) from $GRAIL_DIR; the component's
! pre-/post-load doits (rowan/components/doits) carry install.gs's other steps.
! ===============================================================================
output pushnew install.out
fileformat utf8
iferr 1 exit 1
login

iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

run
| grailDir warnings |
grailDir := System gemEnvironmentVariable: 'GRAIL_DIR'.
grailDir ifNil: [ ^ self error: 'GRAIL_DIR is not set' ].
warnings := OrderedCollection new.
[ (Rowan projectFromUrl: 'file:' , grailDir , '/rowan/specs/Grail.ston' diskUrl: 'file:' , grailDir) load ]
	on: CompileWarning
	do: [:ex |
		(ex description includesString: 'not optimized') ifFalse: [ warnings add: ex description ].
		ex resume ].
warnings do: [:w | Transcript show: 'COMPILE WARNING ' , w ].
Transcript show: 'Rowan loaded Grail: ' , (Rowan projectNamed: 'Grail') printString.
%
commit

run
Transcript show: '==============================================='.
Transcript show: ' Grail installed through Rowan'.
Transcript show: '==============================================='.
%
output pop
logout
exit 0
