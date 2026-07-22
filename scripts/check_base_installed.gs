! ===============================================================================
! Probe: is the Grail shared base installed on this extent?
! ===============================================================================
! Logs in as the ordinary ./.topazini user (NO SystemUser step) and checks for a
! marker that ONLY ./install_base.sh (running as SystemUser) can create:
!
!     Object>>with:with:performMethod:   (env-0, filed by scripts/install_base.gs)
!
! This method needs CompilePrimitives + write access to a policy-1 kernel class,
! so a per-user ./install.sh can never file it; its presence therefore means the
! base has been installed.  Kernel GemStone ships #performMethod: and
! #with:performMethod: on Object natively, but NOT the 2-arg-and-up variants --
! #with:with:performMethod: is added only by Object_perform.gs, so it is a clean
! Grail-base marker that never preexists on a stock extent.
!
! Output contract (parsed by install.sh):
!   * prints  GRAIL_BASE=present  when the marker is found
!   * prints  GRAIL_BASE=absent   when it is not
!   * prints  neither             if login itself fails (stone down / bad creds) --
!                                 install.sh then steps aside and lets the real
!                                 install.gs surface that error instead.
! ===============================================================================

iferr 1 stk
iferr 2 stk
login

run
(Object includesSelector: #'with:with:performMethod:')
    ifTrue:  [ GsFile stdout nextPutAll: 'GRAIL_BASE=present'; lf; flush ]
    ifFalse: [ GsFile stdout nextPutAll: 'GRAIL_BASE=absent';  lf; flush ].
true
%

logout
