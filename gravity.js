window.addEventListener('load', function() {

    var canvas = document.getElementById('world');
    var sim_width = window.innerWidth,
        sim_height = window.innerHeight;

    /* Alias classes. */
    var Engine = Matter.Engine,
        Render = Matter.Render,
        Runner = Matter.Runner,
        Body = Matter.Body,
        Events = Matter.Events,
        Composite = Matter.Composite,
        Composites = Matter.Composites,
        Constraint = Matter.Constraint,
        MouseConstraint = Matter.MouseConstraint,
        Mouse = Matter.Mouse,
        World = Matter.World,
        Bodies = Matter.Bodies,
        Vec = Matter.Vector;

    /* Setup simulator. */
    var engine = Engine.create();
    var world = engine.world;
    var render = Render.create({
        canvas: canvas,
        engine: engine,
        options: {
            width: sim_width,
            height: sim_height,
            wireframes: false,
            background: 'black',

            // showVelocity: true,
            // showCollisions: true,
        }
    });
    var runner = Runner.create();

    /* Add mouse control. */
    var mouse = Mouse.create(render.canvas);
    var mouse_constraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
            stiffness: 0.02,
            render: {
                visible: true,
                color: "black"
            }
        }
    });
    World.add(world, mouse_constraint);
    render.mouse = mouse;

    /* Viewport settings. */
    var viewport_center = {
        x: render.options.width * 0.5,
        y: render.options.height * 0.5
    };
    var cur_center = {
        x: sim_width/2,
        y: sim_height/2
    };
    var cur_zoom = 1;
    look_at();

    /* Custom simulator settings. */
    engine.world.gravity.y = 0;
    /* Higher numbers will make collisions smoother. */
    engine.constraintIterations = 3;
    engine.timing.timeScale = 1;

    /* Liftoff! */
    Render.run(render);
    Runner.run(runner, engine);

    /* Generate all bodies. */
    num_bodies = 250;
    var body_opts = {friction: 0.15, frictionAir: 0, restitution: 0.98};
    var min_radius = 7;
    var random_radius = 20;
    var max_radius = random_radius + min_radius;

    for (var i = 0; i <= num_bodies; i++) {
        var body_radius = (Math.random()**8)*random_radius + min_radius;
        var body = Bodies.circle(Math.random()*sim_width, Math.random()*sim_height, body_radius, body_opts);

        /* Adjust size-mass scaling. */
        Body.setDensity(body, 5);
        Body.setInertia(body, Infinity);

        var whiteness = 255 - (body_radius - min_radius)/random_radius*255;
        body.render.fillStyle = `rgba(255, ${whiteness}, ${whiteness})`;

        World.add(world, [body]);
    }

    /* Casually redefine the universal gravitational constant G
    for a more aesthetically pleasing and stable simulation. */
    var G_const = 7e-6;

    Events.on(engine, 'beforeTick', function() {
        var scale_factor = mouse.wheelDelta * -0.08;

        /* Use the mouse wheel to zoom and pan. */
        if (scale_factor != 0) {
            var delta_center = Vec.sub(mouse.absolute, viewport_center);
            var center_offset = Vec.mult(delta_center, -1*scale_factor);
            cur_center = Vec.add(cur_center, center_offset);

            cur_zoom += scale_factor;
            look_at();
        }
    });

    Events.on(engine, 'beforeUpdate', function(event) {
        bodies = Matter.Composite.allBodies(world);

        /* Total iterations for naive algorithm: n(n-1)/2 -> O(n^2).
        See also: https://en.wikipedia.org/wiki/Newton%27s_law_of_universal_gravitation */
        for (var i = 0; i < bodies.length-1; i++) {
            for(var j = i+1; j < bodies.length; j++) {
                /* Vector pointing from body i towards body j. */
                var diff = Vec.sub(bodies[j].position, bodies[i].position);

                var m1m2 = bodies[i].mass*bodies[j].mass;

                /* Save some costly sqrts by doing the normalization
                ourselves. */
                var r2 = diff["x"]*diff["x"] + diff["y"]*diff["y"];
                var r = Math.sqrt(r2);

                /* Correctly rescale our force vector. */
                var force = Vec.mult(Vec.div(diff, r), G_const * m1m2 / r2);

                /* Apply force to i, apply -force to j. */
                Body.applyForce(bodies[i], bodies[i].position, force);
                Body.applyForce(bodies[j], bodies[j].position, Vec.neg(force));
            }
        }

    });

    /* Rescale and move the render view. */
    function look_at() {
        zoom = cur_zoom / 2;

        Render.lookAt(render,
           cur_center,
           {x: sim_width*zoom, y: sim_height*zoom}
        );
    }

});
