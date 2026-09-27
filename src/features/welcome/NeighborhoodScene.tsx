import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import * as THREE from 'three'

export type SceneView = { yaw: number; pitch: number; zoom: number }

type Props = {
  paused: boolean
  view: SceneView
  resetVersion: number
  onViewChange: (view: Partial<SceneView>) => void
  onInteraction: () => void
  onReady: () => void
  onFailure: () => void
}

function block(group: THREE.Group, size: [number, number, number], position: [number, number, number], color: number, roughness = 1) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color, roughness }))
  mesh.position.set(...position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)
  return mesh
}

function house(group: THREE.Group, x: number, facade: number, selected: boolean, variant: number) {
  const home = new THREE.Group()
  home.position.set(x, 0, -0.75)
  group.add(home)

  block(home, [1.32, 2.64 + variant * 0.15, 1.7], [0, 1.32 + variant * 0.075, 0], facade)
  block(home, [1.44, 0.17, 1.83], [0, 2.68 + variant * 0.15, 0], selected ? 0x9d6819 : 0x3f4642)
  block(home, [1.47, 0.22, 0.13], [0, 2.62 + variant * 0.15, 0.9], selected ? 0xefb83c : 0x444a45)
  block(home, [1.12, 0.1, 0.42], [0, 0.13, 1.05], 0xafa799)

  const windowColor = selected ? 0x36545c : 0x53666a
  for (const floor of [1.27, 2.12]) {
    for (const side of [-0.34, 0.34]) {
      block(home, [0.34, 0.52, 0.045], [side, floor, 0.875], 0xe7dfc9)
      block(home, [0.26, 0.43, 0.05], [side, floor, 0.905], windowColor, 0.35)
      block(home, [0.025, 0.43, 0.056], [side, floor, 0.935], 0xc1b59d)
      block(home, [0.35, 0.05, 0.12], [side, floor - 0.28, 0.95], 0x9d9585)
    }
  }
  block(home, [0.42, 0.9, 0.06], [0, 0.55, 0.88], selected ? 0x32362f : 0x414b4c)
  block(home, [0.04, 0.04, 0.02], [0.15, 0.52, 0.92], 0xefb83c)
  block(home, [0.46, 0.07, 0.3], [0, 0.06, 1.28], 0x827c70)

  if (selected) {
    block(home, [1.54, 0.055, 0.07], [0, 0.04, 1.37], 0xefb83c)
  }
}

function tree(group: THREE.Group, x: number, z: number, scale: number) {
  block(group, [0.12 * scale, 0.8 * scale, 0.12 * scale], [x, 0.4 * scale, z], 0x6a5842)
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.53 * scale, 1), new THREE.MeshStandardMaterial({ color: 0x60735f, flatShading: true, roughness: 1 }))
  crown.position.set(x, 1.06 * scale, z)
  crown.castShadow = true
  group.add(crown)
}

function makeNeighborhood() {
  const neighborhood = new THREE.Group()
  block(neighborhood, [11.9, 0.12, 5.7], [0, -0.13, 0.2], 0xbab6a6)
  block(neighborhood, [11.9, 0.035, 2.2], [0, -0.05, 1.9], 0x717877)
  block(neighborhood, [11.9, 0.04, 0.15], [0, -0.005, 0.75], 0xe5dfce)
  block(neighborhood, [11.9, 0.04, 0.14], [0, -0.005, 3.04], 0xe5dfce)
  for (let x = -5; x < 5.6; x += 2) {
    block(neighborhood, [0.82, 0.012, 0.045], [x, -0.025, 2.13], 0xdbd5bf)
  }
  const houses = [0xb2a89a, 0xc4b7a2, 0x928f83, 0xefb83c, 0xb6b2a4, 0xa99e8e, 0xb9ae9b]
  houses.forEach((facade, index) => house(neighborhood, (index - 3) * 1.48, facade, index === 3, index % 3))
  tree(neighborhood, -5.55, 0.34, 0.9)
  tree(neighborhood, 5.55, 0.28, 0.83)
  tree(neighborhood, -3.65, 3.42, 0.7)
  tree(neighborhood, 3.95, 3.46, 0.78)
  return neighborhood
}

function disposeNeighborhood(neighborhood: THREE.Group | undefined) {
  neighborhood?.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.dispose()
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach(material => material.dispose())
  })
}

export default function NeighborhoodScene({ paused, view, resetVersion, onViewChange, onInteraction, onReady, onFailure }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(paused)
  const viewRef = useRef(view)
  const viewChangeRef = useRef(onViewChange)
  const interactionRef = useRef(onInteraction)
  const readyRef = useRef(onReady)
  const failureRef = useRef(onFailure)
  const drawRef = useRef<() => void>(() => {})
  const resetOrbitRef = useRef<() => void>(() => {})
  const dragRef = useRef<{ pointerId: number; x: number } | null>(null)

  useEffect(() => {
    pausedRef.current = paused
    drawRef.current()
  }, [paused])
  useEffect(() => { viewRef.current = view; drawRef.current() }, [view])
  useEffect(() => { resetOrbitRef.current() }, [resetVersion])
  useEffect(() => { viewChangeRef.current = onViewChange }, [onViewChange])
  useEffect(() => { interactionRef.current = onInteraction }, [onInteraction])
  useEffect(() => { readyRef.current = onReady }, [onReady])
  useEffect(() => { failureRef.current = onFailure }, [onFailure])

  useEffect(() => {
    const element = host.current
    if (!element) return
    let renderer: THREE.WebGLRenderer | undefined
    let frame = 0
    let observer: ResizeObserver | undefined
    let neighborhood: THREE.Group | undefined
    let sun: THREE.DirectionalLight | undefined
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFShadowMap
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.domElement.setAttribute('aria-hidden', 'true')
      element.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      const camera = new THREE.OrthographicCamera(-6.8, 6.8, 5.1, -5.1, 0.1, 100)
      camera.position.set(10, 9, 13)
      camera.lookAt(0, 0.85, 0.3)
      scene.add(new THREE.AmbientLight(0xffffff, 2.2))
      sun = new THREE.DirectionalLight(0xfff4dd, 3.1)
      sun.position.set(-4, 11, 7)
      sun.castShadow = true
      sun.shadow.mapSize.set(1024, 1024)
      sun.shadow.camera.left = -10
      sun.shadow.camera.right = 10
      sun.shadow.camera.top = 10
      sun.shadow.camera.bottom = -10
      sun.shadow.normalBias = 0.04
      scene.add(sun)
      neighborhood = makeNeighborhood()
      scene.add(neighborhood)

      let autoYaw = 0
      let lastTime = performance.now()
      const draw = (time: number) => {
        if (!renderer) return
        if (!pausedRef.current && !document.hidden) autoYaw += Math.min(Math.max(time - lastTime, 0), 100) * 0.000055
        lastTime = time
        const orbitYaw = THREE.MathUtils.degToRad(viewRef.current.yaw) + autoYaw
        element.dataset.cameraYaw = String(Math.round(((THREE.MathUtils.radToDeg(orbitYaw) % 360) + 360) % 360))
        const orbitPitch = THREE.MathUtils.degToRad(viewRef.current.pitch)
        const radius = 16
        camera.position.set(Math.sin(orbitYaw) * Math.cos(orbitPitch) * radius, Math.sin(orbitPitch) * radius + 0.85, Math.cos(orbitYaw) * Math.cos(orbitPitch) * radius + 0.3)
        camera.lookAt(0, 0.85, 0.3)
        const zoom = viewRef.current.zoom
        if (camera.zoom !== zoom) { camera.zoom = zoom; camera.updateProjectionMatrix() }
        renderer.render(scene, camera)
      }
      const resize = () => {
        if (!renderer) return
        const width = Math.max(1, element.clientWidth)
        const height = Math.max(1, element.clientHeight)
        const aspect = width / height
        const span = aspect < 1 ? 6.3 : 5.45
        camera.left = -span * aspect
        camera.right = span * aspect
        camera.top = span
        camera.bottom = -span
        camera.updateProjectionMatrix()
        renderer.setSize(width, height)
        draw(performance.now())
      }
      observer = new ResizeObserver(resize)
      observer.observe(element)
      resize()
      readyRef.current()

      const schedule = () => {
        if (!frame && !pausedRef.current && !document.hidden) frame = requestAnimationFrame(render)
      }
      const render = (time: number) => {
        frame = 0
        draw(time)
        schedule()
      }
      drawRef.current = () => { lastTime = performance.now(); draw(lastTime); schedule() }
      resetOrbitRef.current = () => { autoYaw = 0; lastTime = performance.now(); draw(lastTime) }
      schedule()
      const visibility = () => { drawRef.current() }
      document.addEventListener('visibilitychange', visibility)
      const canvas = renderer.domElement
      const lost = (event: Event) => {
        event.preventDefault()
        console.warn('Illustration WebGL context lost')
        failureRef.current()
      }
      canvas.addEventListener('webglcontextlost', lost)
      return () => {
        cancelAnimationFrame(frame)
        drawRef.current = () => {}
        resetOrbitRef.current = () => {}
        document.removeEventListener('visibilitychange', visibility)
        observer?.disconnect()
        canvas.removeEventListener('webglcontextlost', lost)
        disposeNeighborhood(neighborhood)
        sun?.shadow.map?.dispose()
        renderer?.dispose()
        renderer?.forceContextLoss()
        canvas.remove()
      }
    } catch (error) {
      console.warn('Illustration renderer unavailable', error)
      observer?.disconnect()
      cancelAnimationFrame(frame)
      drawRef.current = () => {}
      resetOrbitRef.current = () => {}
      disposeNeighborhood(neighborhood)
      sun?.shadow.map?.dispose()
      renderer?.dispose()
      renderer?.forceContextLoss()
      renderer?.domElement.remove()
      failureRef.current()
    }
  }, [])

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    dragRef.current = { pointerId: event.pointerId, x: event.clientX }
    event.currentTarget.setPointerCapture(event.pointerId)
    interactionRef.current()
  }
  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const distance = event.clientX - drag.x
    if (Math.abs(distance) < 2) return
    drag.x = event.clientX
    const yaw = ((viewRef.current.yaw + distance * 0.5) % 360 + 360) % 360
    viewRef.current = { ...viewRef.current, yaw }
    viewChangeRef.current({ yaw })
  }
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return <div className="welcome-canvas" data-testid="scene-drag-surface" ref={host} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={() => { dragRef.current = null }}/>
}
