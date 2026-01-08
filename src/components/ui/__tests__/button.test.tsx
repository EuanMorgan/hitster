import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../button";

describe("Button", () => {
	it("renders with children", () => {
		render(<Button>Click me</Button>);
		expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
	});

	it("handles click events", async () => {
		const handleClick = vi.fn();
		const user = userEvent.setup();

		render(<Button onClick={handleClick}>Click me</Button>);
		await user.click(screen.getByRole("button"));

		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	it("renders with different variants", () => {
		const { rerender } = render(<Button variant="default">Default</Button>);
		expect(screen.getByRole("button")).toHaveAttribute("data-variant", "default");

		rerender(<Button variant="destructive">Destructive</Button>);
		expect(screen.getByRole("button")).toHaveAttribute("data-variant", "destructive");

		rerender(<Button variant="outline">Outline</Button>);
		expect(screen.getByRole("button")).toHaveAttribute("data-variant", "outline");
	});

	it("renders with different sizes", () => {
		const { rerender } = render(<Button size="default">Default</Button>);
		expect(screen.getByRole("button")).toHaveAttribute("data-size", "default");

		rerender(<Button size="sm">Small</Button>);
		expect(screen.getByRole("button")).toHaveAttribute("data-size", "sm");

		rerender(<Button size="lg">Large</Button>);
		expect(screen.getByRole("button")).toHaveAttribute("data-size", "lg");
	});

	it("can be disabled", () => {
		render(<Button disabled>Disabled</Button>);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("supports asChild pattern", () => {
		render(
			<Button asChild>
				<a href="/test">Link Button</a>
			</Button>,
		);
		expect(screen.getByRole("link", { name: "Link Button" })).toBeInTheDocument();
	});
});
