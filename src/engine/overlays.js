export function drawFx(els, t, amt, overlay, reduce, cx) {
  const { sats, pings, dots, track, arc } = els;
  const CX = cx;
  const hide = (els) => els.forEach((el) => el.setAttribute("opacity", "0"));
  hide(sats);
  hide(pings);
  hide(dots);
  track.setAttribute("opacity", "0");
  arc.setAttribute("opacity", "0");
  if (amt < 0.02 || reduce) return;
  const ease = 1 - (1 - amt) ** 3;

  if (overlay === "orbit" || overlay === "orbs" || overlay === "whirl") {
    const n = overlay === "orbs" ? 2 : 5;
    const R = (overlay === "whirl" ? 52 : 52) * ease;
    for (let i = 0; i < n; i++) {
      const ang = t * (overlay === "whirl" ? 3.2 : 1.35) + (i / n) * Math.PI * 2;
      const el = sats[i];
      const facing = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(ang));
      el.setAttribute("cx", String(CX + Math.sin(ang) * R));
      el.setAttribute("cy", String(CX - 0.42 * Math.cos(ang) * R));
      el.setAttribute("r", String(4.2 + facing * 2.2));
      el.setAttribute("opacity", String(ease * facing));
    }
  }

  if (overlay === "radar" || overlay === "sweep") {
    const quiet = overlay === "sweep";
    const period = quiet ? 1.85 : 1.3;
    const n = quiet ? 2 : 3;
    const gain = quiet ? 0.64 : 0.7;
    for (let i = 0; i < n; i++) {
      const u = ((t + i * (period / n)) % period) / period;
      const el = pings[i];
      el.setAttribute("r", String(36 + u * 68));
      el.setAttribute("stroke-width", String((quiet ? 2.8 : 3.4) * (1 - 0.55 * u)));
      el.setAttribute("opacity", String(ease * (1 - u) * gain));
    }
  }

  if (overlay === "progress") {
    const c = 2 * Math.PI * 62;
    const u = (t % 2.5) / 2.5;
    track.setAttribute("opacity", String(0.16 * ease));
    arc.setAttribute("opacity", String(0.85 * ease));
    arc.setAttribute("stroke-dasharray", String(c));
    arc.setAttribute("stroke-dashoffset", String(c * (1 - u)));
    arc.setAttribute("transform", `rotate(-90 ${CX} ${CX})`);
  }

  if (overlay === "dots" || overlay === "wave" || overlay === "gather" || overlay === "send" || overlay === "receive" || overlay === "dock" || overlay === "trail" || overlay === "standby") {
    const n = overlay === "wave" ? 4 : overlay === "dock" ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const el = dots[i];
      let cx = CX;
      let cy = CX;
      let op = ease;
      if (overlay === "dots") {
        cx = CX + (i - 1) * 16;
        cy = CX - 78 + Math.sin(t * 3.2 + i) * 6;
      } else if (overlay === "wave") {
        cx = CX + (i - 1.5) * 18;
        cy = CX + 70 + Math.sin(t * 8 + i * 0.9) * 7;
      } else if (overlay === "gather") {
        const a = t * 1.4 + i * 2.1;
        const rad = 70 * (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 1.1)));
        cx = CX + Math.cos(a) * rad;
        cy = CX + Math.sin(a) * rad * 0.7;
      } else if (overlay === "send") {
        const u = (t * 0.7 + i * 0.22) % 1;
        cx = CX + u * 90;
        cy = CX - 10 - u * 40;
        op = ease * (1 - u);
      } else if (overlay === "receive") {
        const u = (t * 0.7 + i * 0.22) % 1;
        cx = CX - 90 + u * 90;
        cy = CX - 50 + u * 40;
        op = ease * u;
      } else if (overlay === "dock") {
        cx = CX + (i === 0 ? -18 : 18);
        cy = CX + 78 - Math.abs(Math.sin(t * 2 + i)) * 10;
      } else if (overlay === "trail") {
        cx = CX + 48 + i * 10;
        cy = CX + 20 + Math.sin(t * 4 + i) * 8 + i * 6;
        op = ease * (1 - i / 4);
      } else if (overlay === "standby") {
        op = ease * (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 2.2 + i)));
        cx = CX + (i - 1) * 14;
        cy = CX + 82;
      }
      el.setAttribute("cx", String(cx));
      el.setAttribute("cy", String(cy));
      el.setAttribute("opacity", String(op));
    }
  }
}
