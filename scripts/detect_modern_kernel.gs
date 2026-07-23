! ===============================================================================
! Probe: is this a "modern" GemStone kernel for Grail?
! ===============================================================================
! Prints exactly one line:
!   GRAIL_MODERN=yes  -- Grail's kernel-class extensions can be installed PER-USER
!                        (no SystemUser base filing of them).  Requires BOTH:
!     (a) env-1 session methods permitted on restricted kernel classes
!         (GsPackagePolicy>>permitSessionMethodFor: GsNMethod ... environmentId: 1)
!         -- i.e. MR#6 + restricted-class-env-1 support; AND
!     (b) the 2/3/4-arg Object>>with:...performMethod: dispatch methods are
!         KERNEL-NATIVE -- present and NOT in Grail's own 'Grail-perform method'
!         category (native ones are in 'Message Handling') -- so Grail need not
!         file the <primitive:2027> variants (which would require CompilePrimitives
!         / SystemUser).
!   GRAIL_MODERN=no   -- legacy kernel: file the kernel extensions as SystemUser
!                        via install_base.gs (the current behavior).
!
! Logs in as the ./.topazini user, which MUST be a NON-SystemUser: capability (a)
! is evaluated partly by writability of the (SystemUser-owned) kernel class, so a
! SystemUser login would mis-report.  Both install_base.sh and install.sh run
! this probe and must agree -- they read the same ./.topazini.  Any failure /
! ambiguity errs toward `no' (legacy SystemUser filing always works).
! ===============================================================================

iferr 1 stk
iferr 2 stk
login

run
| restrictedEnv1 nativePerform m |
restrictedEnv1 := [ GsPackagePolicy current
    permitSessionMethodFor: GsNMethod selector: #'___grailModernProbe___' environmentId: 1 ]
  on: Error do: [:e | false].
m := Object compiledMethodAt: #'with:with:performMethod:' environmentId: 0 otherwise: nil.
nativePerform := m notNil and: [
  ([ Object categoryOfSelector: #'with:with:performMethod:' environmentId: 0 ]
     on: Error do: [:e | #'Grail-perform method']) ~= #'Grail-perform method' ].
(restrictedEnv1 == true and: [ nativePerform == true ])
  ifTrue:  [ GsFile stdout nextPutAll: 'GRAIL_MODERN=yes'; lf; flush ]
  ifFalse: [ GsFile stdout nextPutAll: 'GRAIL_MODERN=no';  lf; flush ].
true
%

logout
